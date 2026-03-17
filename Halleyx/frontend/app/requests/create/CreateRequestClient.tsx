"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import {
  Wallet,
  UserPlus,
  ArrowLeft,
  Upload,
  Calendar,
  MapPin,
  Building2,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function CreateRequestClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = (searchParams?.get("type") ?? null) as "expense" | "onboarding" | null;

  const [activeTab, setActiveTab] = useState<"expense" | "onboarding">(
    typeParam === "onboarding" ? "onboarding" : "expense",
  );

  useEffect(() => {
    if (typeParam === "onboarding" || typeParam === "expense") {
      setActiveTab(typeParam);
    }
  }, [typeParam]);

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("hx-user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  // Expense form state
  const [requestTitle, setRequestTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("US");
  const [department, setDepartment] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Travel");
  const [expenseDate, setExpenseDate] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  // Onboarding form state
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeDepartment, setEmployeeDepartment] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [employmentType, setEmploymentType] = useState<"Full Time" | "Contract" | "Intern">("Full Time");
  const [laptopRequired, setLaptopRequired] = useState(false);
  const [accessRequired, setAccessRequired] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const createExpense = useMutation({
    mutationFn: async () => {
      const payload = {
        title: requestTitle || "Expense Request",
        type: "EXPENSE",
        amount: Number(amount || 0),
        description: description || "",
      };
      // eslint-disable-next-line no-console
      console.log("EXPENSE SUBMIT:", payload);
      return (await api.post("/request/create", payload)).data;
    },
    onSuccess: (r) => router.push(`/requests/${r.id}`),
  });

  const createOnboarding = useMutation({
    mutationFn: async () => {
      const payload = {
        title: employeeName ? `Onboarding: ${employeeName}` : "Onboarding Request",
        type: "ONBOARDING",
        description: notes || "",
      };
      // eslint-disable-next-line no-console
      console.log("ONBOARDING SUBMIT:", payload);
      return (await api.post("/request/create", payload)).data;
    },
    onSuccess: (r) => router.push(`/requests/${r.id}`),
  });

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700/80 p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Create Request</h2>
              <p className="text-[11px] text-slate-400">
                Submit an expense or onboarding request{user?.role ? ` · as ${user.role}` : ""}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("expense")}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              activeTab === "expense"
                ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                : "border-slate-800/80 bg-slate-950/60 text-slate-300 hover:bg-slate-900/60"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Expense
            </span>
          </button>
          <button
            onClick={() => setActiveTab("onboarding")}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              activeTab === "onboarding"
                ? "border-violet-500/60 bg-violet-500/10 text-violet-200"
                : "border-slate-800/80 bg-slate-950/60 text-slate-300 hover:bg-slate-900/60"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Onboarding
            </span>
          </button>
        </div>

        {activeTab === "expense" ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400/80" />
              Expense Request
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Request Title</div>
                <input
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Country
                </div>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Department
                </div>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Category
                </div>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                >
                  {["Travel", "Food", "Equipment", "Other"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Expense Date
                </div>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Priority</div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                >
                  {["Low", "Medium", "High"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="text-[11px] text-slate-400">Description (optional)</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Receipt URL (optional)
                </div>
                <input
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>

            {createExpense.isError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Failed to create expense request.
              </div>
            )}
            {createExpense.isSuccess && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Request created.
              </div>
            )}

            <button
              disabled={createExpense.isPending}
              onClick={() => createExpense.mutate()}
              className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              Submit Expense Request
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-violet-400/80" />
              Onboarding Request
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">New Employee Name</div>
                <input
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Email</div>
                <input
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Department</div>
                <input
                  value={employeeDepartment}
                  onChange={(e) => setEmployeeDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Role</div>
                <input
                  value={employeeRole}
                  onChange={(e) => setEmployeeRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Start Date</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-400">Employment Type</div>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                >
                  {["Full Time", "Contract", "Intern"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="text-[11px] text-slate-400">Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={laptopRequired}
                  onChange={(e) => setLaptopRequired(e.target.checked)}
                />
                Laptop required
              </label>
            </div>

            <button
              disabled={createOnboarding.isPending}
              onClick={() => createOnboarding.mutate()}
              className="rounded-xl border border-violet-500/60 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 hover:bg-violet-500/20 transition disabled:opacity-50"
            >
              Submit Onboarding Request
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

