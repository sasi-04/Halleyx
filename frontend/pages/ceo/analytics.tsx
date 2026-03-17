import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";

interface AnalyticsResponse {
  expensesByDepartment: { department: string; _count: { id: number } }[];
  approvalsVsRejections: { decision: "APPROVED" | "REJECTED"; _count: { id: number } }[];
  avgCompletionMs: number;
  activeDepartments: { department: string; _count: { id: number } }[];
}

async function fetchAnalytics() {
  const { data } = await apiClient.get<AnalyticsResponse>("/analytics");
  return data;
}

const PIE_COLORS = ["#111827", "#e11d48"];

export default function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["ceo-analytics"],
    queryFn: fetchAnalytics
  });

  const avgDays =
    data && data.avgCompletionMs
      ? data.avgCompletionMs / (1000 * 60 * 60 * 24)
      : 0;

  const approvalsData =
    data?.approvalsVsRejections.map((a) => ({
      name: a.decision,
      value: a._count.id
    })) ?? [];

  const deptRequests =
    data?.expensesByDepartment.map((e) => ({
      department: e.department,
      count: e._count.id
    })) ?? [];

  const mostActive =
    data?.activeDepartments.map((d) => ({
      department: d.department,
      count: d._count.id
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Visual insights into requests, approvals, and workflow performance.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Avg workflow completion time</div>
          </div>
          <div className="px-4 py-4">
            <div className="ceo-card-value">
              {avgDays ? `${avgDays.toFixed(1)} days` : "—"}
            </div>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Most active departments</div>
          </div>
          <div className="px-4 py-4 text-sm space-y-1">
            {mostActive.length ? (
              mostActive.slice(0, 4).map((d) => (
                <div key={d.department} className="flex justify-between">
                  <span>{d.department}</span>
                  <span className="text-neutral-500">{d.count}</span>
                </div>
              ))
            ) : (
              <span className="text-neutral-400">No data yet.</span>
            )}
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Approval vs rejection rate</div>
          </div>
          <div className="px-4 py-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={approvalsData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                  innerRadius={30}
                >
                  {approvalsData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Total expense requests per department</div>
          </div>
          <div className="px-4 py-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptRequests}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Most active departments (all workflows)</div>
          </div>
          <div className="px-4 py-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostActive}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6b7280" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

