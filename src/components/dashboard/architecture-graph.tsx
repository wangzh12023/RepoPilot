"use client";

import { useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
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

export function ArchitectureGraph({
  title,
  description,
  nodes,
  edges,
  onSelectNode,
}: ArchitectureGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id ?? null);
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

  const [flowNodes, , onNodesChange] = useNodesState<RepoFlowNode>(initialNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState<RepoFlowEdge>(initialEdges);

  const handleNodeSelect = (node: RepoFlowNode) => {
    setSelectedNodeId(node.id);
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
          <div className="min-w-[880px]">
            <div className="h-[560px] w-full">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  style: {
                    stroke: "var(--color-border)",
                  },
                }}
                onNodeClick={(_, node) => handleNodeSelect(node as RepoFlowNode)}
              >
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
