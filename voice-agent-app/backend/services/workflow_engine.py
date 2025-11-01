"""
Workflow Engine - Executes agent graphs as orchestrated workflows.

This engine traverses the graph structure defined in agent profiles and
executes nodes in the correct order, handling branching, conditions, and
tool invocations.
"""
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from enum import Enum
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo


class NodeType(Enum):
    """Supported node types in the workflow"""
    START = "start"
    TONE = "tone"
    BEHAVIOR = "behavior"
    PROMPT = "prompt"
    TOOL = "tool"
    SUMMARY = "summary"
    CONDITION = "condition"
    ACTION = "action"


class ExecutionStatus(Enum):
    """Node execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class NodeExecutionResult:
    """Result of a node execution"""
    node_id: str
    status: ExecutionStatus
    output: Any
    metadata: Dict[str, Any]
    error: Optional[str] = None
    next_nodes: Optional[List[str]] = None  # For conditional branching


@dataclass
class WorkflowContext:
    """Context passed through the workflow execution"""
    # Conversation context
    user_message: str
    conversation_history: List[Dict[str, Any]]
    system_prompt: str
    
    # Agent profile settings
    tone: str
    behavior: str
    speaking_style: str
    welcome_message: str
    
    # Execution state
    variables: Dict[str, Any]  # Shared variables between nodes
    executed_nodes: Set[str]
    node_outputs: Dict[str, Any]
    
    # Tools and services
    tool_registry: Any  # Access to registered tools
    llm_service: Any  # Access to LLM service
    
    # Metadata
    current_time: datetime
    timezone: ZoneInfo


class WorkflowEngine:
    """
    Executes agent graphs as workflows.
    
    The engine:
    1. Traverses the graph starting from the START node
    2. Executes each node based on its type
    3. Handles conditional branching
    4. Manages execution context
    5. Returns the final output
    """
    
    def __init__(self):
        self.node_executors: Dict[NodeType, 'BaseNodeExecutor'] = {}
        self._register_default_executors()
    
    def _register_default_executors(self):
        """Register default node executors"""
        from services.node_executors import (
            StartNodeExecutor,
            ToneNodeExecutor,
            BehaviorNodeExecutor,
            PromptNodeExecutor,
            ToolNodeExecutor,
            SummaryNodeExecutor,
            ConditionNodeExecutor,
            ActionNodeExecutor,
        )
        
        self.node_executors[NodeType.START] = StartNodeExecutor()
        self.node_executors[NodeType.TONE] = ToneNodeExecutor()
        self.node_executors[NodeType.BEHAVIOR] = BehaviorNodeExecutor()
        self.node_executors[NodeType.PROMPT] = PromptNodeExecutor()
        self.node_executors[NodeType.TOOL] = ToolNodeExecutor()
        self.node_executors[NodeType.SUMMARY] = SummaryNodeExecutor()
        self.node_executors[NodeType.CONDITION] = ConditionNodeExecutor()
        self.node_executors[NodeType.ACTION] = ActionNodeExecutor()
    
    def register_executor(self, node_type: NodeType, executor: 'BaseNodeExecutor'):
        """Register a custom node executor"""
        self.node_executors[node_type] = executor
    
    async def execute_workflow(
        self,
        graph: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        Execute a workflow graph.
        
        Args:
            graph: The graph structure with nodes and edges
            context: The workflow execution context
        
        Returns:
            The final execution result
        """
        nodes = {node['id']: node for node in graph.get('nodes', [])}
        edges = graph.get('edges', [])
        
        # Build adjacency list for quick traversal
        adjacency = self._build_adjacency_list(edges)
        
        # Find the start node
        start_node = self._find_start_node(nodes)
        if not start_node:
            return NodeExecutionResult(
                node_id="workflow",
                status=ExecutionStatus.FAILED,
                output=None,
                metadata={},
                error="No START node found in graph"
            )
        
        # Execute the workflow starting from START node
        try:
            result = await self._execute_from_node(
                start_node['id'],
                nodes,
                adjacency,
                context
            )
            return result
        except Exception as e:
            print(f"❌ Workflow execution error: {e}")
            import traceback
            traceback.print_exc()
            return NodeExecutionResult(
                node_id="workflow",
                status=ExecutionStatus.FAILED,
                output=None,
                metadata={},
                error=str(e)
            )
    
    async def _execute_from_node(
        self,
        node_id: str,
        nodes: Dict[str, Any],
        adjacency: Dict[str, List[str]],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        Recursively execute nodes starting from a given node.
        
        This implements depth-first execution with support for:
        - Sequential execution (follow edges)
        - Conditional branching (based on node output)
        - Parallel execution (multiple edges from one node)
        """
        # Check if already executed (prevent cycles)
        if node_id in context.executed_nodes:
            print(f"⏩ Skipping already executed node: {node_id}")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.SKIPPED,
                output=context.node_outputs.get(node_id),
                metadata={}
            )
        
        # Get the node
        node = nodes.get(node_id)
        if not node:
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.FAILED,
                output=None,
                metadata={},
                error=f"Node {node_id} not found"
            )
        
        # Mark as executed
        context.executed_nodes.add(node_id)
        
        # Get the executor for this node type
        node_type_str = node.get('type', '').lower()
        try:
            node_type = NodeType(node_type_str)
        except ValueError:
            print(f"⚠️ Unknown node type: {node_type_str}, skipping")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.SKIPPED,
                output=None,
                metadata={},
                error=f"Unknown node type: {node_type_str}"
            )
        
        executor = self.node_executors.get(node_type)
        if not executor:
            print(f"⚠️ No executor for node type: {node_type_str}")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.SKIPPED,
                output=None,
                metadata={},
                error=f"No executor for node type: {node_type_str}"
            )
        
        # Execute the node
        print(f"🔄 Executing node: {node_id} (type: {node_type_str})")
        result = await executor.execute(node, context)
        
        # Store the output
        context.node_outputs[node_id] = result.output
        
        # If execution failed, stop here
        if result.status == ExecutionStatus.FAILED:
            print(f"❌ Node {node_id} failed: {result.error}")
            return result
        
        # Determine next nodes to execute
        next_node_ids = []
        
        # If node explicitly specifies next nodes (e.g., condition)
        if result.next_nodes:
            next_node_ids = result.next_nodes
        else:
            # Follow the edges
            next_node_ids = adjacency.get(node_id, [])
        
        # If no next nodes, this is the end
        if not next_node_ids:
            print(f"✅ Workflow completed at node: {node_id}")
            return result
        
        # Execute next nodes
        # For simplicity, we execute them sequentially
        # (could be parallelized for better performance)
        last_result = result
        for next_id in next_node_ids:
            last_result = await self._execute_from_node(
                next_id,
                nodes,
                adjacency,
                context
            )
            # If any node fails, stop execution
            if last_result.status == ExecutionStatus.FAILED:
                break
        
        return last_result
    
    def _build_adjacency_list(self, edges: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Build adjacency list from edges"""
        adjacency = {}
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                if source not in adjacency:
                    adjacency[source] = []
                adjacency[source].append(target)
        return adjacency
    
    def _find_start_node(self, nodes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find the START node in the graph"""
        for node_id, node in nodes.items():
            if node.get('type', '').lower() == 'start':
                return node
        return None
    
    def validate_graph(self, graph: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate a graph structure.
        
        Returns:
            (is_valid, error_message)
        """
        nodes = graph.get('nodes', [])
        edges = graph.get('edges', [])
        
        if not nodes:
            return False, "Graph has no nodes"
        
        # Check for START node
        has_start = any(n.get('type', '').lower() == 'start' for n in nodes)
        if not has_start:
            return False, "Graph must have a START node"
        
        # Check for duplicate node IDs
        node_ids = [n.get('id') for n in nodes]
        if len(node_ids) != len(set(node_ids)):
            return False, "Duplicate node IDs found"
        
        # Check that all edges reference valid nodes
        node_id_set = set(node_ids)
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source not in node_id_set:
                return False, f"Edge references non-existent source node: {source}"
            if target not in node_id_set:
                return False, f"Edge references non-existent target node: {target}"
        
        return True, None


# Singleton instance
workflow_engine = WorkflowEngine()
