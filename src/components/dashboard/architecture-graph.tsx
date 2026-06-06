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
  nodes: GraphNode[];
  edges: GraphEdge[];
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
  nodes,
  edges,
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

  const selectedNode =
    flowNodes.find((node) => node.id === selectedNodeId)?.data ?? flowNodes[0]?.data;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[520px] w-full">
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
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <Badge variant="brand-secondary">Selected module</Badge>
          <CardTitle>{selectedNode?.title}</CardTitle>
          <CardDescription className="font-mono text-xs">
            {selectedNode?.path}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{selectedNode?.summary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={selectedNode?.importance === "Core" ? "default" : "secondary"}>
              {selectedNode?.importance}
            </Badge>
            <Badge variant="outline">{selectedNode?.language}</Badge>
            <Badge variant="outline">{selectedNode?.framework}</Badge>
            <Badge variant="outline">{selectedNode?.coverage} tests</Badge>
          </div>
          <div className="grid gap-3">
            {flowNodes.slice(0, 4).map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedNodeId === node.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <p className="text-sm font-medium">{node.data.title}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {node.data.path}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
