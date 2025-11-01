"""
Node Executors - Execute individual nodes in the workflow.

Each node type has a corresponding executor that implements the
execution logic for that node.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import asyncio
import re
from datetime import datetime


# Import from workflow_engine to avoid circular import
from services.workflow_engine import (
    NodeExecutionResult,
    ExecutionStatus,
    WorkflowContext,
)


class BaseNodeExecutor(ABC):
    """Base class for all node executors"""
    
    @abstractmethod
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """Execute the node and return the result"""
        pass


class StartNodeExecutor(BaseNodeExecutor):
    """Executes START nodes - entry point of workflow"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        START node initializes the workflow.
        Sets up initial variables and context.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        print(f"🚀 Starting workflow execution")
        
        # Initialize workflow variables
        context.variables['workflow_started_at'] = context.current_time.isoformat()
        context.variables['initial_message'] = context.user_message
        
        # Extract any start node configuration
        title = data.get('title', 'Voice Agent Workflow')
        description = data.get('description', '')
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={
                'message': f'Workflow started: {title}',
                'description': description,
            },
            metadata={
                'node_type': 'start',
                'title': title,
            }
        )


class ToneNodeExecutor(BaseNodeExecutor):
    """Executes TONE nodes - sets conversation tone"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        TONE node updates the conversation tone dynamically.
        Can override the default tone from profile.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        # Get tone from node data or use profile default
        tone = data.get('tone', context.tone)
        
        # Update context tone
        if tone:
            context.tone = tone
            context.variables['current_tone'] = tone
            print(f"🎨 Set conversation tone: {tone}")
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={'tone': tone},
            metadata={
                'node_type': 'tone',
                'applied_tone': tone,
            }
        )


class BehaviorNodeExecutor(BaseNodeExecutor):
    """Executes BEHAVIOR nodes - defines agent behavior"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        BEHAVIOR node updates agent behavior instructions.
        Can add or override behavior rules.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        # Get behavior from node data or use profile default
        behavior = data.get('behavior', context.behavior)
        
        # Update context behavior
        if behavior:
            context.behavior = behavior
            context.variables['current_behavior'] = behavior
            print(f"🎭 Set agent behavior: {behavior[:50]}...")
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={'behavior': behavior},
            metadata={
                'node_type': 'behavior',
                'applied_behavior': behavior,
            }
        )


class PromptNodeExecutor(BaseNodeExecutor):
    """Executes PROMPT nodes - custom prompt templates"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        PROMPT node applies a custom prompt template.
        Can inject variables and format instructions.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        # Get prompt template
        prompt_template = data.get('description', '')
        
        # Replace variables in template
        rendered_prompt = self._render_template(prompt_template, context)
        
        # Store rendered prompt in context
        context.variables['custom_prompt'] = rendered_prompt
        print(f"📝 Applied prompt template: {rendered_prompt[:50]}...")
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={'prompt': rendered_prompt},
            metadata={
                'node_type': 'prompt',
                'template': prompt_template,
                'rendered': rendered_prompt,
            }
        )
    
    def _render_template(self, template: str, context: WorkflowContext) -> str:
        """Render template with variable substitution"""
        if not template:
            return ""
        
        # Replace {variable_name} with actual values
        pattern = r'\{(\w+)\}'
        
        def replace_var(match):
            var_name = match.group(1)
            return str(context.variables.get(var_name, match.group(0)))
        
        return re.sub(pattern, replace_var, template)


class ToolNodeExecutor(BaseNodeExecutor):
    """Executes TOOL nodes - invokes tools"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        TOOL node invokes a specific tool.
        Can be used to check calendar, book appointments, etc.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        tool_type = data.get('toolType', 'calendar')
        tool_title = data.get('title', 'Tool')
        tool_status = data.get('status', 'inactive')
        
        # Check if tool is enabled
        if tool_status != 'active':
            print(f"⏭️ Tool node skipped (inactive): {tool_title}")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.SKIPPED,
                output={'message': f'Tool {tool_title} is disabled'},
                metadata={
                    'node_type': 'tool',
                    'tool_type': tool_type,
                    'skipped': True,
                }
            )
        
        # Execute tool based on type
        print(f"🔧 Executing tool: {tool_title} (type: {tool_type})")
        
        # Tool execution will be handled by SmolAgent's tool system
        # Here we just mark that this tool should be available
        context.variables[f'tool_executed_{tool_type}'] = True
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={
                'tool_type': tool_type,
                'tool_title': tool_title,
                'message': f'Tool {tool_title} available for execution'
            },
            metadata={
                'node_type': 'tool',
                'tool_type': tool_type,
                'tool_title': tool_title,
            }
        )


class SummaryNodeExecutor(BaseNodeExecutor):
    """Executes SUMMARY nodes - creates summaries"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        SUMMARY node generates a summary of the conversation or workflow.
        """
        node_id = node['id']
        data = node.get('data', {})
        
        summary_description = data.get('description', 'Generate conversation summary')
        
        # Create a summary of workflow execution
        summary_data = {
            'nodes_executed': len(context.executed_nodes),
            'variables_set': len(context.variables),
            'conversation_turns': len(context.conversation_history),
            'description': summary_description,
        }
        
        context.variables['workflow_summary'] = summary_data
        print(f"📊 Generated workflow summary")
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output=summary_data,
            metadata={
                'node_type': 'summary',
                'summary': summary_data,
            }
        )


class ConditionNodeExecutor(BaseNodeExecutor):
    """Executes CONDITION nodes - conditional branching"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        CONDITION node evaluates a condition and routes to different paths.
        
        Supports:
        - Variable comparisons
        - Intent detection
        - Keyword matching
        - Custom expressions
        """
        node_id = node['id']
        data = node.get('data', {})
        
        condition_type = data.get('conditionType', 'keyword')
        condition_value = data.get('conditionValue', '')
        true_path = data.get('truePath')  # Node ID to execute if true
        false_path = data.get('falsePath')  # Node ID to execute if false
        
        # Evaluate condition
        result = await self._evaluate_condition(
            condition_type,
            condition_value,
            context
        )
        
        print(f"🔀 Condition evaluated: {result} (type: {condition_type})")
        
        # Determine next node based on result
        next_nodes = []
        if result and true_path:
            next_nodes.append(true_path)
        elif not result and false_path:
            next_nodes.append(false_path)
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output={'condition_result': result},
            metadata={
                'node_type': 'condition',
                'condition_type': condition_type,
                'result': result,
            },
            next_nodes=next_nodes
        )
    
    async def _evaluate_condition(
        self,
        condition_type: str,
        condition_value: str,
        context: WorkflowContext
    ) -> bool:
        """Evaluate a condition based on type"""
        user_message = context.user_message.lower()
        
        if condition_type == 'keyword':
            # Check if keyword exists in message
            keywords = [k.strip().lower() for k in condition_value.split(',')]
            return any(keyword in user_message for keyword in keywords)
        
        elif condition_type == 'intent':
            # Detect intent (simplified)
            if 'book' in condition_value.lower() or 'schedule' in condition_value.lower():
                return any(word in user_message for word in ['book', 'schedule', 'appointment', 'meeting'])
            elif 'check' in condition_value.lower() or 'view' in condition_value.lower():
                return any(word in user_message for word in ['check', 'show', 'view', 'what', 'when'])
            return False
        
        elif condition_type == 'variable':
            # Check variable value
            parts = condition_value.split('==')
            if len(parts) == 2:
                var_name = parts[0].strip()
                expected = parts[1].strip().strip('"\'')
                actual = str(context.variables.get(var_name, ''))
                return actual == expected
            return False
        
        return False


class ActionNodeExecutor(BaseNodeExecutor):
    """Executes ACTION nodes - perform actions"""
    
    async def execute(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """
        ACTION node performs a specific action.
        
        Actions can:
        - Set variables
        - Modify context
        - Trigger side effects
        - Format responses
        """
        node_id = node['id']
        data = node.get('data', {})
        
        action_type = data.get('actionType', 'set_variable')
        action_config = data.get('actionConfig', {})
        
        print(f"⚡ Executing action: {action_type}")
        
        result_data = {}
        
        if action_type == 'set_variable':
            # Set a variable in context
            var_name = action_config.get('variableName', 'result')
            var_value = action_config.get('variableValue', '')
            context.variables[var_name] = var_value
            result_data = {'variable': var_name, 'value': var_value}
        
        elif action_type == 'format_response':
            # Format the response template
            template = action_config.get('template', '')
            formatted = self._format_template(template, context)
            context.variables['formatted_response'] = formatted
            result_data = {'formatted_response': formatted}
        
        elif action_type == 'update_tone':
            # Dynamically update tone
            new_tone = action_config.get('tone', context.tone)
            context.tone = new_tone
            result_data = {'tone': new_tone}
        
        return NodeExecutionResult(
            node_id=node_id,
            status=ExecutionStatus.COMPLETED,
            output=result_data,
            metadata={
                'node_type': 'action',
                'action_type': action_type,
                'result': result_data,
            }
        )
    
    def _format_template(self, template: str, context: WorkflowContext) -> str:
        """Format template with variables"""
        if not template:
            return ""
        
        # Simple variable substitution
        pattern = r'\{(\w+)\}'
        
        def replace_var(match):
            var_name = match.group(1)
            return str(context.variables.get(var_name, match.group(0)))
        
        return re.sub(pattern, replace_var, template)
