"use client";

import React, { useState } from "react";
import { useAiChatStore } from "../../store/aiChatStore";
import { api } from "../../api/client";
import { v4 as uuid } from "uuid";

type Mode = "workflow" | "rule" | "debug";

export const AiAssistantPanel: React.FC<{
  executionId?: string;
}> = ({ executionId }) => {
  const { messages, addMessage } = useAiChatStore();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("workflow");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: uuid(), role: "user" as const, content: input };
    addMessage(userMsg);
    setInput("");
    setLoading(true);
    try {
      let reply = "I could not process your request.";
      if (mode === "workflow") {
        const { data } = await api.post("/ai/suggest-workflow", {
          description: input,
        });
        reply =
          "Here is a generated workflow JSON:\n" +
          "```json\n" +
          JSON.stringify(data, null, 2) +
          "\n```";
      } else if (mode === "rule") {
        const { data } = await api.post("/ai/generate-rule", {
          description: input,
          fields: [],
        });
        reply =
          "Suggested rule condition:\n```text\n" +
          data.candidate_condition +
          "\n```";
      } else if (mode === "debug" && executionId) {
        const { data } = await api.post("/ai/explain-logs", {
          executionId,
        });
        reply = data.explanation;
      } else {
        reply = "For debugging I need an execution selected.";
      }
      addMessage({ id: uuid(), role: "assistant", content: reply });
    } catch (err: any) {
      addMessage({
        id: uuid(),
        role: "assistant",
        content:
          err?.response?.data?.error ??
          "Failed to get AI response. Check server logs.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-white/70 dark:bg-neutral-900/80 rounded-lg">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="font-medium text-sm">Workflow Assistant</span>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setMode("workflow")}
            className={`px-2 py-1 rounded ${
              mode === "workflow"
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            Workflow
          </button>
          <button
            onClick={() => setMode("rule")}
            className={`px-2 py-1 rounded ${
              mode === "rule"
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            Rule
          </button>
          <button
            onClick={() => setMode("debug")}
            className={`px-2 py-1 rounded ${
              mode === "debug"
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            Debug
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 space-y-2 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap rounded-md px-2 py-1 ${
              m.role === "user"
                ? "bg-blue-50 dark:bg-blue-950/40"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            <span className="block font-semibold mb-0.5 capitalize">
              {m.role}
            </span>
            <span>{m.content}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-neutral-500 text-xs">
            Ask me to generate a workflow from natural language, craft rule
            conditions, or debug an execution.
          </p>
        )}
      </div>
      <div className="border-t p-2 space-y-1">
        <textarea
          className="w-full text-xs rounded-md border bg-white dark:bg-neutral-900 px-2 py-1 resize-none h-16"
          placeholder="Describe a workflow, rule, or ask why an execution failed..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          disabled={loading}
          onClick={handleSend}
          className="w-full rounded-md bg-blue-600 text-white text-xs py-1.5 font-medium disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Send to Assistant"}
        </button>
      </div>
    </div>
  );
};

