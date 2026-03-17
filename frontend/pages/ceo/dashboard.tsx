import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

interface DashboardResponse {
  cards: {
    pendingExecutiveApprovals: number;
    highPriorityExpenses: number;
    totalRequestsToday: number;
    completedWorkflows: number;
  };
  recentDecisions: any[];
  escalatedRequests: any[];
}

async function fetchDashboard() {
  const { data } = await apiClient.get<DashboardResponse>("/dashboard");
  return data;
}

const mockTrendData = [
  { date: "Mon", approvals: 12 },
  { date: "Tue", approvals: 18 },
  { date: "Wed", approvals: 9 },
  { date: "Thu", approvals: 21 },
  { date: "Fri", approvals: 15 }
];

const mockDeptActivity = [
  { department: "Engineering", requests: 32 },
  { department: "Sales", requests: 24 },
  { department: "Marketing", requests: 14 },
  { department: "HR", requests: 10 }
];

export default function CeoDashboardPage() {
  const { data } = useQuery({
    queryKey: ["ceo-dashboard"],
    queryFn: fetchDashboard
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">
          High-level view of escalated workflows and organizational activity.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Pending Executive Approvals</div>
          </div>
          <div className="px-4 py-4">
            <div className="ceo-card-value">
              {data?.cards.pendingExecutiveApprovals ?? "--"}
            </div>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">High Priority Expense Requests</div>
          </div>
          <div className="px-4 py-4">
            <div className="ceo-card-value">
              {data?.cards.highPriorityExpenses ?? "--"}
            </div>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Total Requests Today</div>
          </div>
          <div className="px-4 py-4">
            <div className="ceo-card-value">
              {data?.cards.totalRequestsToday ?? "--"}
            </div>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Completed Workflows</div>
          </div>
          <div className="px-4 py-4">
            <div className="ceo-card-value">
              {data?.cards.completedWorkflows ?? "--"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="ceo-card lg:col-span-2">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Expense approval trends</div>
          </div>
          <div className="px-4 py-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="approvals" stroke="#111827" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Department request activity</div>
          </div>
          <div className="px-4 py-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDeptActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#111827" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Recent executive decisions</div>
          </div>
          <div className="px-4 py-4">
            <div className="space-y-3 text-sm">
              {data?.recentDecisions?.length ? (
                data.recentDecisions.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {d.decision} · {d.workflow.requestType}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {d.workflow.department} · {new Date(d.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {d.comment && (
                      <div className="max-w-xs text-right text-xs text-neutral-500">
                        {d.comment}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-neutral-400">No recent decisions.</div>
              )}
            </div>
          </div>
        </div>

        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Escalated requests requiring attention</div>
          </div>
          <div className="px-4 py-4">
            <div className="space-y-3 text-sm">
              {data?.escalatedRequests?.length ? (
                data.escalatedRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {r.employeeName} · {r.department}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {r.requestType} · {r.priority} ·{" "}
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-red-600">
                      {r.amount ? `$${r.amount.toFixed(0)}` : ""}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-neutral-400">No escalated requests.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

