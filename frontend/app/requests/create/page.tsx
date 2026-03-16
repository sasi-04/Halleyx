"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { Wallet, UserPlus, ArrowLeft, Upload, Calendar, MapPin, Building2, Tag, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function CreateRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as "expense" | "onboarding" | null;

  const [activeTab, setActiveTab] = useState<"expense" | "onboarding">(
    typeParam === "onboarding" ? "onboarding" : "expense"
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Onboarding form state
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [email, setEmail] = useState("");
  const [onbDepartment, setOnbDepartment] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [manager, setManager] = useState("");
  const [employmentType, setEmploymentType] = useState("Full Time");
  const [laptopRequired, setLaptopRequired] = useState(false);
  const [accessRequired, setAccessRequired] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const expenseMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("requestTitle", requestTitle);
      formData.append("amount", amount);
      formData.append("country", country);
      formData.append("department", department);
      formData.append("expenseCategory", expenseCategory);
      formData.append("expenseDate", expenseDate);
      formData.append("priority", priority);
      formData.append("description", description);
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      const res = await api.post("/requests/expense", {
        request_title: requestTitle,
        amount: Number(amount) || 0,
        country,
        department,
        expense_category: expenseCategory,
        expense_date: expenseDate,
        priority,
        description,
        receipt_url: receiptFile ? "uploaded" : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      router.push(`/requests/${data.id}`);
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/requests/onboarding", {
        new_employee_name: newEmployeeName,
        email,
        department: onbDepartment,
        role,
        start_date: startDate,
        manager: manager || undefined,
        employment_type: employmentType,
        laptop_required: laptopRequired,
        access_required: accessRequired,
        notes: notes || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      router.push(`/requests/${data.id}`);
    },
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle || !amount || !department || !expenseDate) return;
    expenseMutation.mutate();
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName || !email || !onbDepartment || !role || !startDate) return;
    onboardingMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleAccessToggle = (access: string) => {
    setAccessRequired(prev => 
      prev.includes(access) 
        ? prev.filter(a => a !== access)
        : [...prev, access]
    );
  };

  const inputCls =
    "w-full rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";
  const cardCls = "rounded-2xl border border-slate-700/60 bg-slate-950/40 p-8 shadow-xl";
  const tabCls = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200";
  const buttonCls = "w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20";

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
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
              Submit an expense or onboarding request to start a workflow.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-800/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("expense")}
          className={`${tabCls} ${
            activeTab === "expense"
              ? "bg-amber-500/20 border border-amber-500/50 text-amber-200 shadow-lg shadow-amber-500/10"
              : "border border-slate-700/80 text-slate-400 hover:bg-slate-800/60"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Expense Request
        </button>
        <button
          onClick={() => setActiveTab("onboarding")}
          className={`${tabCls} ${
            activeTab === "onboarding"
              ? "bg-violet-500/20 border border-violet-500/50 text-violet-200 shadow-lg shadow-violet-500/10"
              : "border border-slate-700/80 text-slate-400 hover:bg-slate-800/60"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Onboarding Request
        </button>
      </div>

      {activeTab === "expense" && (
        <form onSubmit={handleExpenseSubmit} className={cardCls}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Expense Request</h3>
            <p className="text-[11px] text-slate-400">Submit an expense request for approval</p>
          </div>

          {/* Auto-filled employee info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelCls}>Employee ID</label>
              <input
                type="text"
                value={user?.id || ""}
                readOnly
                className={`${inputCls} bg-slate-800/60 text-slate-500`}
              />
            </div>
            <div>
              <label className={labelCls}>Employee Name</label>
              <input
                type="text"
                value={user?.name || ""}
                readOnly
                className={`${inputCls} bg-slate-800/60 text-slate-500`}
              />
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Request Title *</label>
              <input
                type="text"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                className={inputCls}
                placeholder="e.g. Client Travel Reimbursement"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} pl-7`}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`${inputCls} pl-9`}
                  >
                    <option value="US">United States</option>
                    <option value="IN">India</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Department *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="e.g. Engineering"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Expense Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className={`${inputCls} pl-9`}
                  >
                    <option value="Travel">Travel</option>
                    <option value="Food">Food</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Expense Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputCls} min-h-[80px] pl-9`}
                  placeholder="Provide details about this expense..."
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Receipt Upload</label>
              <div className="relative">
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-upload"
                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-600/60 rounded-xl cursor-pointer hover:border-slate-500/60 transition-colors"
                >
                  <Upload className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-sm text-slate-400">
                    {receiptFile ? receiptFile.name : "Click to upload receipt (PDF, PNG, JPG)"}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={expenseMutation.isPending || !requestTitle || !amount || !department || !expenseDate}
                className={`${buttonCls} bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/30`}
              >
                {expenseMutation.isPending ? (
                  <span className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Expense Request
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "onboarding" && (
        <form onSubmit={handleOnboardingSubmit} className={cardCls}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Onboarding Request</h3>
            <p className="text-[11px] text-slate-400">Submit an onboarding request for a new employee</p>
          </div>

          {/* Auto-filled employee info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelCls}>Employee ID</label>
              <input
                type="text"
                value={user?.id || ""}
                readOnly
                className={`${inputCls} bg-slate-800/60 text-slate-500`}
              />
            </div>
            <div>
              <label className={labelCls}>Employee Name</label>
              <input
                type="text"
                value={user?.name || ""}
                readOnly
                className={`${inputCls} bg-slate-800/60 text-slate-500`}
              />
            </div>
          </div>

          {/* New Employee Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>New Employee Name *</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="john.doe@company.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Department *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={onbDepartment}
                    onChange={(e) => setOnbDepartment(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="e.g. Engineering"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Role *</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="Software Engineer"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Manager (optional)</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="Alice Smith"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className={inputCls}
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Laptop Required</label>
                <div className="flex items-center h-10">
                  <button
                    type="button"
                    onClick={() => setLaptopRequired(!laptopRequired)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      laptopRequired ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        laptopRequired ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm text-slate-400">
                    {laptopRequired ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Access Required</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['GitHub', 'Slack', 'Jira', 'Email'].map((access) => (
                  <label
                    key={access}
                    className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                      accessRequired.includes(access)
                        ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
                        : 'border-slate-600/60 hover:border-slate-500/60 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={accessRequired.includes(access)}
                      onChange={() => handleAccessToggle(access)}
                      className="sr-only"
                    />
                    {access}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputCls} min-h-[80px] pl-9`}
                  placeholder="Additional notes for the onboarding process..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  onboardingMutation.isPending ||
                  !newEmployeeName ||
                  !email ||
                  !onbDepartment ||
                  !role ||
                  !startDate
                }
                className={`${buttonCls} bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-violet-500/30`}
              >
                {onboardingMutation.isPending ? (
                  <span className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Onboarding Request
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </Shell>
  );
}
