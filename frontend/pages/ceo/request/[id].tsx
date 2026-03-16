import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { WorkflowProgress } from "@/components/ceo-dashboard/WorkflowProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
}

interface Decision {
  id: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string | null;
  createdAt: string;
  ceo: {
    name: string;
    email: string;
  };
}

interface WorkflowDetail {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  requestType: "EXPENSE" | "ONBOARDING";
  amount: number | null;
  priority: string;
  status: string;
  submittedAt: string;
  currentStep: string;
  steps: WorkflowStep[];
  decisions: Decision[];
}

async function fetchApprovalDetail(id: string) {
  const { data } = await apiClient.get<WorkflowDetail>(`/approvals/${id}`);
  return data;
}

export default function RequestDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query as { id?: string };
  const [comment, setComment] = useState("");

  const { data } = useQuery({
    queryKey: ["approval-detail", id],
    queryFn: () => fetchApprovalDetail(id as string),
    enabled: !!id
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: "APPROVED" | "REJECTED") =>
      apiClient.post(`/approvals/${id}/decision`, { decision, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["executive-approvals"] });
    }
  });

  if (!data) {
    return (
      <div>
        <p className="text-sm text-neutral-500">Loading request details…</p>
      </div>
    );
  }

  const orderedSteps = data.steps.sort((a, b) => a.order - b.order);
  const visualizationSteps = orderedSteps.map((s) => ({
    name: s.name,
    completed: s.completed,
    isCurrent: !s.completed && data.currentStep === s.name
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Request {data.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Full context and workflow progress for this escalated request.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="ceo-card lg:col-span-2">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Employee & department</div>
          </div>
          <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-neutral-500">Employee</div>
              <div className="mt-1 font-medium">{data.employeeName}</div>
              <div className="text-xs text-neutral-500">{data.employeeId}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500">Department</div>
              <div className="mt-1 font-medium">{data.department}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500">Request type</div>
              <div className="mt-1 font-medium">{data.requestType}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500">Priority</div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    data.priority === "HIGH"
                      ? "bg-red-50 text-red-700"
                      : data.priority === "MEDIUM"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {data.priority}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500">Amount</div>
              <div className="mt-1 font-medium">
                {data.amount ? `$${data.amount.toFixed(2)}` : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500">Submitted</div>
              <div className="mt-1 font-medium">
                {new Date(data.submittedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Current status</div>
          </div>
          <div className="px-4 py-4 text-sm space-y-2">
            <div className="text-xs font-medium text-neutral-500">Workflow status</div>
            <div className="text-base font-semibold">{data.status}</div>
            <div className="text-xs font-medium text-neutral-500 mt-3">
              Current step
            </div>
            <div className="text-sm text-neutral-700">{data.currentStep}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="ceo-card lg:col-span-2">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Workflow progress</div>
          </div>
          <div className="px-4 py-4">
            <WorkflowProgress steps={visualizationSteps} />
          </div>
        </div>

        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">CEO decision</div>
          </div>
          <div className="px-4 py-4 space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">
                Executive comment
              </div>
              <Input
                placeholder="E.g. Approved due to strategic business requirement."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={() => decisionMutation.mutate("APPROVED")}
                disabled={decisionMutation.isPending}
              >
                Approve
              </Button>
              <Button
                className="flex-1"
                size="sm"
                variant="destructive"
                onClick={() => decisionMutation.mutate("REJECTED")}
                disabled={decisionMutation.isPending}
              >
                Reject
              </Button>
            </div>
            <p className="text-xs text-neutral-500">
              Approval continues the workflow to completion. Rejection stops the
              workflow and notifies the employee.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Approval history</div>
          </div>
          <div className="px-4 py-4 text-sm">
            {data.decisions.length ? (
              <div className="space-y-3">
                {data.decisions.map((d) => (
                  <div
                    key={d.id}
                    className="border border-border rounded-md px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {d.decision} by {d.ceo.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {d.comment && (
                      <div className="mt-1 text-xs text-neutral-600">
                        {d.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">
                No executive decisions recorded yet.
              </p>
            )}
          </div>
        </div>

        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Supporting documents</div>
          </div>
          <div className="px-4 py-4 text-sm text-neutral-500">
            This is where the workflow engine should surface any uploaded receipts,
            contracts, or onboarding documents associated with the request.
          </div>
        </div>
      </div>
    </div>
  );
}

