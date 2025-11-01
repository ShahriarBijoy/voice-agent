"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { LayoutGrid, RefreshCcw, Plus, Play, Save } from "lucide-react";
import dagre from "@dagrejs/dagre";
import {
  AgentEdge,
  AgentGraph,
  AgentNode,
  AgentProfileDraft,
  AgentProfile,
} from "@/lib/schemas/agent";
import {
  AgentBehaviorNode,
  AgentPromptNode,
  AgentStartNode,
  AgentSummaryNode,
  AgentToneNode,
  AgentToolNode,
  AgentConditionNode,
  AgentActionNode,
} from "@/components/agent-builder/nodes";
import { NodePalette } from "@/components/agent-builder/node-palette";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const nodeTypes = {
  start: AgentStartNode as any,
  tone: AgentToneNode as any,
  behavior: AgentBehaviorNode as any,
  prompt: AgentPromptNode as any,
  tool: AgentToolNode as any,
  summary: AgentSummaryNode as any,
  condition: AgentConditionNode as any,
  action: AgentActionNode as any,
};

interface AgentCanvasProps {
  profile: AgentProfileDraft;
  onUpdate(graph: AgentGraph): void;
  onNodeSelect(nodeId: string | null): void;
  onNewAgent?(): void;
  isSaving?: boolean;
  hasChanges?: boolean;
  onSave(): void;
  onPreview(): void;
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

export function AgentBuilderCanvas({ 
  profile, 
  onUpdate, 
  onNodeSelect, 
  onNewAgent,
  isSaving = false,
  hasChanges = false,
  onSave,
  onPreview,
}: AgentCanvasProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get("id");
  const [nodes, setNodes] = useState<AgentNode[]>(profile.graph.nodes);
  const [edges, setEdges] = useState<AgentEdge[]>(profile.graph.edges);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Load agents list
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.data || []);
        }
      } catch (error) {
        console.error("Failed to load agents:", error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    loadAgents();
  }, [profile.id]); // Reload when profile changes

  const handleSelectAgent = useCallback((value: string) => {
    if (value === "new") {
      router.push("/agents");
    } else {
      router.push(`/agents?id=${encodeURIComponent(value)}`);
    }
  }, [router]);

  // Sync state when profile changes (e.g., when New Agent is clicked)
  useEffect(() => {
    setNodes(profile.graph.nodes);
    setEdges(profile.graph.edges);
  }, [profile.graph.nodes, profile.graph.edges]);

  const handleAddNode = useCallback(
    (nodeType: string) => {
      const newNode: AgentNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: { 
          x: Math.random() * 400, 
          y: Math.random() * 400 
        },
        data: {
          title: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
          description: `New ${nodeType} node`,
        },
      };

      setNodes((current) => {
        const next = [...current, newNode];
        setTimeout(() => onUpdate({ nodes: next, edges }), 0);
        return next;
      });
    },
    [edges, onUpdate]
  );

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
      <TooltipProvider>
        <div className="flex h-full gap-4">
          <div className="w-64 shrink-0">
            <NodePalette onAddNode={handleAddNode} />
          </div>
          <div className="flex flex-1 flex-col gap-4">
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
                <Select
                  value={currentId || "new"}
                  onValueChange={handleSelectAgent}
                  disabled={isLoadingAgents}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-left">
                        <Plus className="h-4 w-4 shrink-0" />
                        <span>New Agent</span>
                      </div>
                    </SelectItem>
                    {agents.length > 0 && (
                      <>
                        <div className="border-t border-border my-1" />
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex flex-col text-left w-full">
                              <span className="font-medium">{agent.name}</span>
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {agent.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {onNewAgent && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2"
                    onClick={onNewAgent}
                  >
                    <Plus className="h-4 w-4" />
                    New Agent
                  </Button>
                )}
                <ButtonGroup>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoLayout}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto Layout</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetGraph}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onPreview}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preview Experience</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving || !hasChanges}
                      >
                        <Save className="h-4 w-4" />
                        <span className="sr-only">
                          {isSaving ? "Saving..." : "Save Agent"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isSaving ? "Saving..." : "Save Agent"}</p>
                    </TooltipContent>
                  </Tooltip>
                </ButtonGroup>
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
      </div>
      </TooltipProvider>
    </ReactFlowProvider>
  );
}


