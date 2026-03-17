import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WorkflowRow {
  id: string;
  employeeName: string;
  department: string;
  requestType: string;
  amount: number | null;
  priority: string;
  submittedAt: string;
  currentStep: string;
}

async function fetchExecutiveApprovals(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<WorkflowRow[]>("/approvals", { params });
  return data;
}

export default function ExecutiveApprovalsPage() {
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["executive-approvals", department, priority, from, to],
    queryFn: () =>
      fetchExecutiveApprovals({
        department: department || undefined,
        priority: priority || undefined,
        from: from || undefined,
        to: to || undefined
      })
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Approvals</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Requests escalated to you based on amount and priority.
          </p>
        </div>
      </div>

      <div className="ceo-card">
        <div className="ceo-card-header">
          <div className="ceo-card-title">Filters</div>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Department</div>
            <Input
              placeholder="e.g. Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Priority</div>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" }
              ]}
              placeholder="Any"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">From</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium text-neutral-500 mb-1">To</div>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button
              className="mt-5"
              variant="outline"
              size="sm"
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
          <div className="ceo-card-title">Requests requiring CEO approval</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Request ID</th>
              <th className="px-4 py-2 text-left font-medium">Employee Name</th>
              <th className="px-4 py-2 text-left font-medium">Department</th>
              <th className="px-4 py-2 text-left font-medium">Request Type</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 text-left font-medium">Priority</th>
              <th className="px-4 py-2 text-left font-medium">Submitted Date</th>
              <th className="px-4 py-2 text-left font-medium">Current Step</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-2 align-middle font-mono text-xs text-neutral-500">
                    {row.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 align-middle">{row.employeeName}</td>
                  <td className="px-4 py-2 align-middle text-neutral-600">
                    {row.department}
                  </td>
                  <td className="px-4 py-2 align-middle">{row.requestType}</td>
                  <td className="px-4 py-2 align-middle text-right">
                    {row.amount ? `$${row.amount.toFixed(0)}` : "—"}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.priority === "HIGH"
                          ? "bg-red-50 text-red-700"
                          : row.priority === "MEDIUM"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-middle text-neutral-600">
                    {new Date(row.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 align-middle text-neutral-600">
                    {row.currentStep}
                  </td>
                  <td className="px-4 py-2 align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/ceo/request/${row.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-sm text-neutral-400"
                >
                  No requests currently require your approval.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

