"use client";
import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useReactFlow,
  useEdgesState,
  useNodesState,
  useNodesInitialized,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GraphEdge, GraphNode, GraphNodeData } from "@/lib/repo-analysis";

type RepoFlowNode = Node<GraphNodeData, "module">;
type RepoFlowEdge = Edge;

type ArchitectureGraphProps = {
  title: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNodeData) => void;
};

function ModuleNode({ data }: NodeProps<RepoFlowNode>) {
  return (
    <Card className="min-w-[240px] border-border/70 bg-background/95 shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-primary !bg-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-primary !bg-background"
      />
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm">{data.title}</CardTitle>
            <CardDescription className="font-mono text-[11px]">
              {data.path}
            </CardDescription>
          </div>
          <Badge variant={data.importance === "Core" ? "default" : "secondary"}>
            {data.importance}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground">{data.summary}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.language}</Badge>
          <Badge variant="outline">{data.framework}</Badge>
          <Badge variant="outline">{data.coverage} tests</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

const nodeTypes = {
  module: ModuleNode,
};

function FitViewController({ dependencyKey }: { dependencyKey: string }) {
  const { fitView } = useReactFlow<RepoFlowNode, RepoFlowEdge>();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }

    const runFitView = () => {
      void fitView({
        padding: 0.18,
        duration: 250,
        maxZoom: 1,
      });
    };

    const frameId = window.requestAnimationFrame(runFitView);
    const timeoutId = window.setTimeout(runFitView, 180);
    const handleResize = () => runFitView();

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [dependencyKey, fitView, nodesInitialized]);

  return null;
}

export function ArchitectureGraph({
  title,
  description,
  nodes,
  edges,
  onSelectNode,
}: ArchitectureGraphProps) {
  const initialNodes = nodes.map((node) => ({
    ...node,
    type: "module" as const,
  }));
  const initialEdges = edges.map((edge) => ({
    ...edge,
    animated: edge.source === "analyze-route" || edge.target === "mentor",
    style: {
      strokeWidth: 1.5,
    },
    labelStyle: {
      fontSize: 11,
    },
  }));

  const [flowNodes, , onNodesChange] =
    useNodesState<RepoFlowNode>(initialNodes);
  const [flowEdges, , onEdgesChange] =
    useEdgesState<RepoFlowEdge>(initialEdges);
  const canvasWidth = useMemo(() => {
    const rightEdge = Math.max(
      ...nodes.map((node) => node.position.x + 320),
      960,
    );

    return rightEdge + 120;
  }, [nodes]);
  const fitDependencyKey = useMemo(
    () => flowNodes.map((node) => `${node.id}:${node.position.x}:${node.position.y}`).join("|"),
    [flowNodes],
  );

  const handleNodeSelect = (node: RepoFlowNode) => {
    onSelectNode?.(node.data);
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="max-w-full break-words leading-relaxed">
              {description}
            </CardDescription>
          </div>
          <Badge variant="outline">{flowNodes.length} nodes</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div
            className="min-w-[960px]"
            style={{ width: `${canvasWidth}px` }}
          >
            <div className="h-[560px] w-full min-w-[960px]">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{
                  padding: 0.18,
                  maxZoom: 1,
                }}
                proOptions={{ hideAttribution: true }}
                minZoom={0.2}
                maxZoom={1.25}
                defaultEdgeOptions={{
                  style: {
                    stroke: "var(--color-border)",
                  },
                }}
                onNodeClick={(_, node) =>
                  handleNodeSelect(node as RepoFlowNode)
                }
              >
                <FitViewController dependencyKey={fitDependencyKey} />
                <Background
                  id="repo-grid"
                  gap={20}
                  size={1}
                  variant={BackgroundVariant.Dots}
                />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  className="!border !border-border !bg-background"
                  nodeStrokeWidth={3}
                />
              </ReactFlow>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
