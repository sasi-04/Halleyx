import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/ceo/dashboard", label: "Dashboard" },
  { href: "/ceo/executive-approvals", label: "Executive Approvals" },
  { href: "/ceo/analytics", label: "Analytics" },
  { href: "/ceo/decision-history", label: "Decision History" },
  { href: "/ceo/notifications", label: "Notifications" },
  { href: "/ceo/profile", label: "Profile" }
];

export function CeoLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (router.pathname.startsWith("/ceo") && (!user || user.role !== "CEO")) {
      // In a real app, redirect to login.
      // For now, just log for clarity.
      // eslint-disable-next-line no-console
      console.warn("Non-CEO tried to access CEO routes");
    }
  }, [router.pathname, user]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Workflow Automation
          </div>
          <div className="mt-1 text-lg font-semibold">CEO Panel</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 text-xs text-neutral-500 flex items-center justify-between">
          <span>{user?.name ?? "Executive"}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-white/80 dark:bg-neutral-950/80">
          <div className="text-base font-semibold">CEO Panel</div>
        </header>
        <div className="flex-1 px-4 md:px-8 py-6 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

