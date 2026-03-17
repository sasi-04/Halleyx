import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface NotificationsResponse {
  escalated: {
    id: string;
    employeeName: string;
    department: string;
    requestType: string;
    priority: string;
    amount: number | null;
    submittedAt: string;
  }[];
  recentDecisions: {
    id: string;
    decision: "APPROVED" | "REJECTED";
    createdAt: string;
    workflow: {
      id: string;
      requestType: string;
      department: string;
    };
  }[];
}

async function fetchNotifications() {
  const { data } = await apiClient.get<NotificationsResponse>("/notifications");
  return data;
}

export default function NotificationsPage() {
  const { data } = useQuery({
    queryKey: ["ceo-notifications"],
    queryFn: fetchNotifications
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-neutral-500 mt-1">
          High-priority requests, escalations, and recent executive actions.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Escalated workflows</div>
          </div>
          <div className="px-4 py-4 text-sm space-y-3">
            {data?.escalated?.length ? (
              data.escalated.map((r) => (
                <div key={r.id} className="border border-border rounded-md px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {r.employeeName} · {r.department}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(r.submittedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {r.requestType} · {r.priority}
                    {r.amount ? ` · $${r.amount.toFixed(0)}` : ""}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-sm">
                No escalated workflows at the moment.
              </p>
            )}
          </div>
        </div>

        <div className="ceo-card">
          <div className="ceo-card-header">
            <div className="ceo-card-title">Recent executive decisions</div>
          </div>
          <div className="px-4 py-4 text-sm space-y-3">
            {data?.recentDecisions?.length ? (
              data.recentDecisions.map((d) => (
                <div key={d.id} className="border border-border rounded-md px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {d.decision} · {d.workflow.requestType}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {d.workflow.department} · #{d.workflow.id.slice(0, 8)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-sm">
                No recent executive decisions.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-400">
        Email alerts for high-priority and large expense submissions are sent via
        Nodemailer using the configured SMTP settings.
      </div>
    </div>
  );
}

