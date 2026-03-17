import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DecisionRow {
  id: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string | null;
  createdAt: string;
  workflow: {
    id: string;
    department: string;
    requestType: string;
  };
}

async function fetchDecisionHistory(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<DecisionRow[]>("/decisions", { params });
  return data;
}

export default function DecisionHistoryPage() {
  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["ceo-decision-history", department, requestType, from, to],
    queryFn: () =>
      fetchDecisionHistory({
        department: department || undefined,
        requestType: requestType || undefined,
        from: from || undefined,
        to: to || undefined
      })
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decision History</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Audit trail of all executive approvals and rejections.
        </p>
      </div>

      <div className="ceo-card">
        <div className="ceo-card-header">
          <div className="ceo-card-title">Filters</div>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Department</div>
            <Input
              placeholder="e.g. Sales"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Request type</div>
            <Select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "ONBOARDING", label: "Onboarding" }
              ]}
              placeholder="Any"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">From</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">To</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="ceo-card overflow-x-auto">
        <div className="ceo-card-header">
          <div className="ceo-card-title">Executive decisions</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Request ID</th>
              <th className="px-4 py-2 text-left font-medium">Department</th>
              <th className="px-4 py-2 text-left font-medium">Request Type</th>
              <th className="px-4 py-2 text-left font-medium">Decision</th>
              <th className="px-4 py-2 text-left font-medium">Decision Date</th>
              <th className="px-4 py-2 text-left font-medium">Comments</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-2 align-middle font-mono text-xs text-neutral-500">
                    {row.workflow.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 align-middle">{row.workflow.department}</td>
                  <td className="px-4 py-2 align-middle">
                    {row.workflow.requestType}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.decision === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {row.decision}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-middle text-neutral-600">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 align-middle text-neutral-600 max-w-xs">
                    <div className="line-clamp-2">
                      {row.comment || <span className="text-neutral-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-neutral-400"
                >
                  No executive decisions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

