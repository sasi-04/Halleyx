"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../../api/client";
import { Shell } from "../../../../components/layout/Shell";

export default function WorkflowExecutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [inputData, setInputData] = useState<string>("{}");

  const startExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Invalid workflow id.");
      let parsed: any = {};
      try {
        parsed = JSON.parse(inputData || "{}");
      } catch {
        throw new Error("Input data must be valid JSON.");
      }
      const res = await api.post(`/workflows/${id}/execute`, {
        data: parsed,
      });
      return res.data;
    },
    onSuccess: (execution) => {
      router.push(`/executions/${execution.id}`);
    },
  });

  useEffect(() => {
    // seed with simple example
    setInputData(JSON.stringify({ amount: 1200, priority: "high" }, null, 2));
  }, []);

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Execute Workflow</h2>
          <p className="text-xs text-neutral-500">
            Provide input data that will be validated and used for rule
            evaluation.
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 border rounded-lg p-4 space-y-2">
          <label className="text-xs font-semibold">Execution Input (JSON)</label>
          <textarea
            className="w-full border rounded px-2 py-1.5 text-xs font-mono h-64"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
          />
          {startExecutionMutation.error && (
            <p className="text-xs text-red-500">
              {(startExecutionMutation.error as any).message ??
                "Failed to start execution"}
            </p>
          )}
          <button
            onClick={() => startExecutionMutation.mutate()}
            disabled={startExecutionMutation.isPending}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {startExecutionMutation.isPending ? "Starting..." : "Start Workflow"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

