"use client";

import { useCallback, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import {
  Background,
  Connection,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, RefreshCcw } from "lucide-react";
import dagre from "@dagrejs/dagre";
import {
  AgentEdge,
  AgentGraph,
  AgentNode,
  AgentProfileDraft,
} from "@/lib/schemas/agent";
import {
  AgentBehaviorNode,
  AgentPromptNode,
  AgentStartNode,
  AgentSummaryNode,
  AgentToneNode,
  AgentToolNode,
} from "@/components/agent-builder/nodes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nodeTypes = {
  start: AgentStartNode as any,
  tone: AgentToneNode as any,
  behavior: AgentBehaviorNode as any,
  prompt: AgentPromptNode as any,
  tool: AgentToolNode as any,
  summary: AgentSummaryNode as any,
};

interface AgentCanvasProps {
  profile: AgentProfileDraft;
  onUpdate(graph: AgentGraph): void;
  onNodeSelect(nodeId: string | null): void;
}

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

function layoutNodes(nodes: AgentNode[], edges: AgentEdge[]) {
  const g = dagreGraph;
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 240, height: 120 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const position = g.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - 120,
        y: position.y - 60,
      },
    };
  });
}

export function AgentBuilderCanvas({ profile, onUpdate, onNodeSelect }: AgentCanvasProps) {
  const [nodes, setNodes] = useState<AgentNode[]>(profile.graph.nodes);
  const [edges, setEdges] = useState<AgentEdge[]>(profile.graph.edges);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current as any) as AgentNode[];
        // Defer onUpdate to avoid setState during render
        setTimeout(() => onUpdate({ nodes: next, edges }), 0);
        return next;
      });
    },
    [edges, onUpdate],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);
        // Defer onUpdate to avoid setState during render
        setTimeout(() => onUpdate({ nodes, edges: next }), 0);
        return next;
      });
    },
    [nodes, onUpdate],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge(connection, current as Edge[]);
        // Defer onUpdate to avoid setState during render
        setTimeout(() => onUpdate({ nodes, edges: next as AgentEdge[] }), 0);
        return next as AgentEdge[];
      });
    },
    [nodes, onUpdate],
  );

  const handleAutoLayout = useCallback(() => {
    const laidOutNodes = layoutNodes(nodes, edges);
    setNodes(laidOutNodes);
    // Defer onUpdate to avoid setState during render
    setTimeout(() => onUpdate({ nodes: laidOutNodes, edges }), 0);
  }, [nodes, edges, onUpdate]);

  const handleResetGraph = useCallback(() => {
    setNodes(profile.graph.nodes);
    setEdges(profile.graph.edges);
    // Defer onUpdate to avoid setState during render
    setTimeout(() => onUpdate(profile.graph), 0);
  }, [profile.graph, onUpdate]);

  const statusSummary = useMemo(() => {
    const toolCount = nodes.filter((node) => node.type === "tool").length;
    return { toolCount, nodeCount: nodes.length };
  }, [nodes]);

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col gap-4">
        <header className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Agent Canvas
            </h2>
            <p className="text-sm text-muted-foreground">
              {statusSummary.nodeCount} nodes · {statusSummary.toolCount} tools
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleAutoLayout}
            >
              <LayoutGrid className="h-4 w-4" />
              Auto Layout
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={handleResetGraph}
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </header>
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-inner">
          <AnimatePresence mode="wait">
            <motion.div
              key="agent-canvas"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
            >
              <ReactFlow
                nodes={nodes as any}
                edges={edges as Edge[]}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onNodeClick={(_, node) => onNodeSelect(node.id)}
                onPaneClick={() => onNodeSelect(null)}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                className={cn("bg-muted/20")}
              >
                <Background />
              </ReactFlow>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ReactFlowProvider>
  );
}


