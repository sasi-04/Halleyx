"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { Shell } from "../../../components/layout/Shell";
import ReactFlow, { Background, Controls, MiniMap, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AiAssistantPanel } from "../../../components/ai/AiAssistantPanel";

interface Rule {
  id: string;
  condition: string;
  next_step_id: string | null;
  priority: number;
  is_default: boolean;
}

interface Step {
  id: string;
  name: string;
  step_type: "task" | "approval" | "notification";
  order: number;
  metadata: any;
  rules: Rule[];
}

interface Workflow {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  input_schema: any;
  start_step_id: string | null;
  steps: Step[];
}

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [schemaText, setSchemaText] = useState<string>("");

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const res = await api.get(`/workflows/${id}`);
      return res.data as Workflow;
    },
    enabled: !!id,
    onSuccess: (wf) => {
      setSchemaText(JSON.stringify(wf.input_schema, null, 2));
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (payload: Partial<Workflow>) => {
      const res = await api.put(`/workflows/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (payload: Partial<Step>) => {
      const res = await api.post(`/workflows/${id}/steps`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data: Partial<Step> }) => {
      const res = await api.put(`/steps/${stepId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      await api.delete(`/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async ({
      stepId,
      data,
    }: {
      stepId: string;
      data: Partial<Rule>;
    }) => {
      const res = await api.post(`/steps/${stepId}/rules`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: Partial<Rule>;
    }) => {
      const res = await api.put(`/rules/${ruleId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await api.delete(`/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const nodes: Node[] = useMemo(() => {
    if (!workflow) return [];
    return workflow.steps.map((s, index) => ({
      id: s.id,
      data: { label: `${s.name} (${s.step_type})` },
      position: { x: index * 220, y: index * 40 },
    }));
  }, [workflow]);

  const edges = useMemo(() => {
    if (!workflow) return [];
    const allEdges: { id: string; source: string; target: string | null; label: string }[] = [];
    for (const s of workflow.steps) {
      for (const r of s.rules) {
        if (r.next_step_id) {
          allEdges.push({
            id: r.id,
            source: s.id,
            target: r.next_step_id,
            label: r.is_default ? "DEFAULT" : r.condition,
          });
        }
      }
    }
    return allEdges;
  }, [workflow]);

  if (isLoading || !workflow) {
    return (
      <Shell>
        <p className="text-sm text-neutral-500">Loading workflow...</p>
      </Shell>
    );
  }

  const selectedStep = workflow.steps.find((s) => s.id === selectedStepId);

  return (
    <Shell>
      <div className="flex h-[calc(100vh-80px)] gap-5">
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-50">
                Workflow Editor
              </h2>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Configure steps, branching rules, and approvals. Changes are saved back
                to the current workflow version.
              </p>
            </div>
            <div className="space-x-2 text-[11px] flex items-center">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${
                  workflow.is_active
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-500/60 bg-slate-800/80 text-slate-200"
                }`}
              >
                {workflow.is_active ? "Active" : "Draft"}
              </span>
              <button
                onClick={() =>
                  updateWorkflowMutation.mutate({ is_active: !workflow.is_active })
                }
                className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 hover:border-blue-400/70 hover:bg-slate-800/80 transition"
              >
                {workflow.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[2fr,3fr] gap-4 min-h-0 flex-1">
            <div className="flex flex-col gap-3 overflow-auto pr-1">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300">
                  Workflow name
                </label>
                <input
                  className="w-full border border-slate-700/80 bg-slate-950/80 text-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent"
                  defaultValue={workflow.name}
                  onBlur={(e) =>
                    updateWorkflowMutation.mutate({ name: e.target.value })
                  }
                />
                <label className="text-[11px] font-semibold mt-2 text-slate-300">
                  Input schema (JSON / Zod-like)
                </label>
                <textarea
                  className="w-full border border-slate-800/80 bg-slate-950/90 text-[11px] text-slate-100 rounded-xl px-3 py-1.5 font-mono h-40 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  onBlur={() => {
                    try {
                      const parsed = JSON.parse(schemaText || "{}");
                      updateWorkflowMutation.mutate({ input_schema: parsed });
                    } catch {
                      // ignore parse error; UI acts as text editor
                    }
                  }}
                />
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Steps
                  </span>
                  <button
                    className="text-[11px] rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-blue-400/70 hover:bg-slate-800/80 transition"
                    onClick={() =>
                      createStepMutation.mutate({
                        name: "New Step",
                        step_type: "task",
                        order: workflow.steps.length + 1,
                        metadata: {},
                      })
                    }
                  >
                    Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {workflow.steps.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-xl border px-3 py-2 text-[11px] flex items-center justify-between cursor-pointer transition ${
                        selectedStepId === s.id
                          ? "border-blue-400/80 bg-blue-500/15 shadow-sm shadow-blue-500/25"
                          : "border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/80"
                      }`}
                      onClick={() => setSelectedStepId(s.id)}
                    >
                      <div>
                        <div className="font-semibold text-slate-100">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="uppercase tracking-wide">
                            {s.step_type}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span>order {s.order}</span>
                        </div>
                      </div>
                      <button
                        className="text-[10px] text-rose-300 hover:text-rose-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStepMutation.mutate(s.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {workflow.steps.length === 0 && (
                    <p className="text-xs text-neutral-500">
                      No steps yet. Add a step to begin designing your workflow.
                    </p>
                  )}
                </div>
              </div>
              {selectedStep && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Step Details – {selectedStep.name}
                    </span>
                    <button
                      className="text-[10px] rounded-full border border-emerald-500/70 bg-emerald-500/15 px-3 py-1 text-emerald-100 hover:bg-emerald-500/25 transition"
                      onClick={() =>
                        updateWorkflowMutation.mutate({
                          start_step_id: selectedStep.id,
                        })
                      }
                    >
                      Set as Start
                    </button>
                  </div>
                  <label className="text-[11px] text-slate-300">Name</label>
                  <input
                    className="w-full border border-slate-700/80 bg-slate-950/80 text-slate-100 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                    defaultValue={selectedStep.name}
                    onBlur={(e) =>
                      updateStepMutation.mutate({
                        stepId: selectedStep.id,
                        data: { name: e.target.value },
                      })
                    }
                  />
                  <label className="text-[11px] mt-1 text-slate-300">Type</label>
                  <select
                    className="w-full border border-slate-700/80 bg-slate-950/80 text-slate-100 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                    value={selectedStep.step_type}
                    onChange={(e) =>
                      updateStepMutation.mutate({
                        stepId: selectedStep.id,
                        data: { step_type: e.target.value as any },
                      })
                    }
                  >
                    <option value="task">Task</option>
                    <option value="approval">Approval</option>
                    <option value="notification">Notification</option>
                  </select>
                  <label className="text-[11px] mt-1 text-slate-300">
                    Metadata (JSON)
                  </label>
                  <textarea
                    className="w-full border border-slate-700/80 bg-slate-950/90 text-[11px] text-slate-100 rounded-lg px-2 py-1 font-mono h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                    defaultValue={JSON.stringify(selectedStep.metadata, null, 2)}
                    onBlur={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || "{}");
                        updateStepMutation.mutate({
                          stepId: selectedStep.id,
                          data: { metadata: parsed },
                        });
                      } catch {
                        // ignore parse error
                      }
                    }}
                  />
                  <label className="text-[11px] mt-2 text-slate-300">Rules</label>
                  <div className="space-y-1">
                    {selectedStep.rules.map((r) => (
                      <div
                        key={r.id}
                        className="border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-[11px] space-y-1 bg-slate-950/70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Priority {r.priority} {r.is_default && "· DEFAULT"}
                          </span>
                          <button
                            className="text-[10px] text-rose-300 hover:text-rose-200"
                            onClick={() => deleteRuleMutation.mutate(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          className="w-full border border-slate-800/80 rounded-md px-1.5 py-1 font-mono bg-slate-950/90 text-slate-100"
                          defaultValue={r.condition}
                          onBlur={(e) =>
                            updateRuleMutation.mutate({
                              ruleId: r.id,
                              data: { condition: e.target.value },
                            })
                          }
                        />
                        <div className="flex gap-2 items-center">
                          <span>Next step:</span>
                          <select
                            className="border border-slate-700/80 bg-slate-950/90 rounded px-1.5 py-0.5"
                            value={r.next_step_id || ""}
                            onChange={(e) =>
                              updateRuleMutation.mutate({
                                ruleId: r.id,
                                data: {
                                  next_step_id: e.target.value || null,
                                },
                              })
                            }
                          >
                            <option value="">(terminate)</option>
                            {workflow.steps.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={r.is_default}
                              onChange={(e) =>
                                updateRuleMutation.mutate({
                                  ruleId: r.id,
                                  data: { is_default: e.target.checked },
                                })
                              }
                            />
                            Default
                          </label>
                        </div>
                      </div>
                    ))}
                    <button
                      className="text-[11px] rounded-full border border-slate-700/80 px-3 py-1 mt-1 hover:border-blue-400/70 hover:bg-slate-900/80 transition"
                      onClick={() =>
                        createRuleMutation.mutate({
                          stepId: selectedStep.id,
                          data: {
                            condition: "DEFAULT",
                            priority: (selectedStep.rules[0]?.priority ?? 0) + 1,
                            next_step_id: null,
                            is_default: true,
                          },
                        })
                      }
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
                <span className="text-[11px] font-semibold text-slate-200">
                  Workflow Graph (Branching & Loops)
                </span>
                <span className="text-[10px] text-slate-500">
                  Drag to explore paths and loops.
                </span>
              </div>
              <div className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.12),_transparent_55%)]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target!,
                    label: e.label,
                    animated: !e.label.includes("DEFAULT"),
                  }))}
                  fitView
                >
                  <MiniMap />
                  <Controls />
                  <Background />
                </ReactFlow>
              </div>
            </div>
          </div>
        </div>
        <div className="w-80">
          <AiAssistantPanel />
        </div>
      </div>
    </Shell>
  );
}

