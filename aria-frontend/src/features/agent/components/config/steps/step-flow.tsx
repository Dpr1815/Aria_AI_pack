/* ─────────────────────────────────────────────────────────
 * StepFlow — linear pipeline visualisation
 *
 * Renders step nodes in a vertical layout using @xyflow/react.
 * Nodes are visually draggable (positions preserved across
 * selection changes). Clicking the canvas background
 * returns to the general settings panel.
 * ───────────────────────────────────────────────────────── */

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnNodesChange,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useAgentEditorStore } from "../../../stores/agent-editor.store";
import { StepNode, type StepNodeData } from "./step-node";
import type { Agent, PanelView } from "../../../types";
import { AddStepModal } from "../add-step-modal";
import { Plus } from "lucide-react";
import { cn } from "@/utils";

/* ── Constants ───────────────────────────────────────────── */

const NODE_GAP_Y = 110;
const NODE_X = 0;

type StepNodeType = Node<StepNodeData, "step">;

const NODE_TYPES = { step: StepNode } as const;

const EDGE_STYLE = {
  stroke: "rgba(255,255,255,0.12)",
  strokeWidth: 2,
} as const;

/* ── Helpers ─────────────────────────────────────────────── */

function getSelectedKey(panel: PanelView): string | null {
  if (panel.kind === "step") return panel.stepKey;
  if (panel.kind === "assessment") return "__assessment__";
  return null;
}

/* ── Component ───────────────────────────────────────────── */

interface StepFlowProps {
  agent: Agent;
}

export function StepFlow({ agent }: StepFlowProps) {
  const panel = useAgentEditorStore((s) => s.panel);
  const showStep = useAgentEditorStore((s) => s.showStep);
  const showAssessment = useAgentEditorStore((s) => s.showAssessment);
  const showSettings = useAgentEditorStore((s) => s.showSettings);
  const [showAddModal, setShowAddModal] = useState(false);
  const { fitView } = useReactFlow();

  const selectedKey = getSelectedKey(panel);

  /** Ref to track user-dragged positions. Survives data changes. */
  const draggedPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const onNodeSelect = useCallback(
    (key: string) => {
      if (key === "__assessment__") {
        if (panel.kind === "assessment") showSettings();
        else showAssessment();
      } else {
        if (panel.kind === "step" && panel.stepKey === key) showSettings();
        else showStep(key);
      }
    },
    [panel, showStep, showAssessment, showSettings],
  );

  /** Click on empty canvas → back to general settings. */
  const handlePaneClick = useCallback(() => {
    if (panel.kind !== "settings") showSettings();
  }, [panel, showSettings]);

  const hasAssessment = !!agent.assessment;
  const stepOrder = agent.stepOrder ?? [];
  const steps = agent.steps ?? {};

  const prevStepCountRef = useRef(stepOrder.length);

  /** Build node + edge arrays from stepOrder. */
  const { built } = useMemo(() => {
    const nodes: StepNodeType[] = [];
    const edges: Edge[] = [];
    const draggedPos = draggedPositionsRef.current;

    stepOrder.forEach((key, idx) => {
      const step = steps[key];
      if (!step) return;

      const isLast = !hasAssessment && idx === stepOrder.length - 1;
      const defaultPos = { x: NODE_X, y: idx * NODE_GAP_Y };

      const data: StepNodeData = {
        label: step.label,
        stepKey: key,
        order: step.order,
        colorIndex: idx,
        isFirst: idx === 0,
        isLast,
        isAssessment: false,
        isSelected: selectedKey === key,
        onSelect: onNodeSelect,
      };

      nodes.push({
        id: key,
        type: "step",
        position: draggedPos.get(key) ?? defaultPos,
        data,
      });

      if (idx > 0) {
        const prevKey = stepOrder[idx - 1]!;
        edges.push({
          id: `${prevKey}-${key}`,
          source: prevKey,
          target: key,
          animated: true,
          style: EDGE_STYLE,
        });
      }
    });

    /* Assessment node — always last, unnumbered */
    if (hasAssessment) {
      const assessmentY = stepOrder.length * NODE_GAP_Y;
      const defaultPos = { x: NODE_X, y: assessmentY };

      const aData: StepNodeData = {
        label: "Assessment",
        stepKey: "__assessment__",
        order: stepOrder.length,
        colorIndex: stepOrder.length,
        isFirst: stepOrder.length === 0,
        isLast: true,
        isAssessment: true,
        isSelected: selectedKey === "__assessment__",
        onSelect: onNodeSelect,
      };

      nodes.push({
        id: "__assessment__",
        type: "step",
        position: draggedPos.get("__assessment__") ?? defaultPos,
        data: aData,
      });

      if (stepOrder.length > 0) {
        const lastStep = stepOrder[stepOrder.length - 1]!;
        edges.push({
          id: `${lastStep}-assessment`,
          source: lastStep,
          target: "__assessment__",
          animated: true,
          style: EDGE_STYLE,
        });
      }
    }

    return { built: { nodes, edges } };
  }, [stepOrder, steps, hasAssessment, selectedKey, onNodeSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges] = useEdgesState(built.edges);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  useEffect(() => {
    if (prevStepCountRef.current !== stepOrder.length) {
      draggedPositionsRef.current.clear();
      prevStepCountRef.current = stepOrder.length;
      const timer = setTimeout(() => fitView({ padding: 0.3 }), 50);
      return () => clearTimeout(timer);
    }
  }, [stepOrder.length, fitView]);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const allowed = changes.filter(
        (c) => c.type === "position" || c.type === "dimensions",
      );
      if (allowed.length === 0) return;

      onNodesChange(allowed);

      for (const change of allowed) {
        if (change.type === "position" && !change.dragging && change.position) {
          draggedPositionsRef.current.set(change.id, change.position);
        }
      }
    },
    [onNodesChange],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
      </ReactFlow>

      {/* ── Floating add-step button ── */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className={cn(
          "absolute bottom-5 left-1/2 -translate-x-1/2",
          "flex items-center gap-2 rounded-button",
          "border border-dashed border-primary/40 bg-surface-raised/90 backdrop-blur-sm",
          "px-4 py-2.5 font-medium text-primary shadow-card",
          "transition-all duration-200",
          "hover:border-primary hover:bg-primary-light hover:shadow-glow",
        )}
        style={{ fontSize: "var(--pt-sm)" }}
      >
        <Plus size={16} />
        Add step
      </button>

      {/* ── Add step modal ── */}
      {showAddModal && (
        <AddStepModal agent={agent} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
