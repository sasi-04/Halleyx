"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toast } from "@/components/ui/toast";
import { Loader2, Upload, ArrowLeft, FileText, DollarSign, Calendar } from "lucide-react";
import Link from "next/link";
import { api } from "@/api/client";

// Form validation schema
const expenseRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  employeeName: z.string().min(1, "Employee name is required"),
  requestTitle: z.string().min(1, "Request title is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  department: z.string().min(1, "Department is required"),
  expenseCategory: z.enum(["travel", "food", "equipment", "software", "other"]),
  expenseDate: z.string().min(1, "Expense date is required"),
  priority: z.enum(["low", "medium", "high"]),
  description: z.string().min(1, "Description is required"),
  receipt: z.instanceof(File).optional(),
});

type ExpenseRequestForm = z.infer<typeof expenseRequestSchema>;

const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "IT",
  "Customer Support"
];

const expenseCategories = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "equipment", label: "Equipment" },
  { value: "software", label: "Software" },
  { value: "other", label: "Other" }
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

export default function ExpenseRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ExpenseRequestForm>({
    resolver: zodResolver(expenseRequestSchema),
    defaultValues: {
      employeeId: "",
      employeeName: "",
      requestTitle: "",
      amount: 0,
      department: "",
      expenseCategory: "other",
      expenseDate: "",
      priority: "medium",
      description: "",
    },
  });

  // Get current user from session/local storage
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // We don't have an `/auth/me` backend route. Derive from JWT payload.
        const token = window.localStorage.getItem("hx-token");
        if (!token) {
          router.push("/login");
          return;
        }

        const parts = token.split(".");
        if (parts.length < 2) throw new Error("Invalid token");
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64Url.length + 3) % 4);
        const payloadJson = JSON.parse(atob(base64));
        setCurrentUser(payloadJson);
        setValue("employeeId", payloadJson.sub || payloadJson.id || "");
        setValue("employeeName", payloadJson.name || "");
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      }
    };

    fetchCurrentUser();
  }, [router, setValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setValue("receipt", file);
    }
  };

  const validateExpenseDate = (dateString: string) => {
    const expenseDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expenseDate.setHours(0, 0, 0, 0);
    return expenseDate <= today;
  };

  const onSubmit = async (data: ExpenseRequestForm) => {
    // Additional validation for expense date
    if (!validateExpenseDate(data.expenseDate)) {
      setError("Expense date cannot be in the future");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = {
        title: "Expense Request",
        type: "EXPENSE",
        amount: data.amount,
        description: data.description,
      };
      // eslint-disable-next-line no-console
      console.log("EXPENSE SUBMIT:", formData);

      const token = window.localStorage.getItem("hx-token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/request/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json().catch(() => ({}));
      console.log("RESPONSE:", json);

      if (res.ok) {
        setSuccess("Expense request submitted successfully!");
        setShowToast({ type: "success", message: "Expense request submitted successfully!" });
        const requestId = json?.request?.id || json?.id || json?.request_id;
        if (requestId) router.push(`/requests/${requestId}`);
        else router.push("/employee/my-requests");
      } else {
        const msg = json?.error || json?.message || "Error submitting request";
        setError(msg);
        setShowToast({ type: "error", message: msg });
      }
    } catch (error: any) {
      console.error("Error submitting expense request:", error);
      const errorMessage =
        error?.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      setShowToast({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {showToast && (
        <Toast
          message={showToast.message}
          type={showToast.type}
          onClose={() => setShowToast(null)}
        />
      )}
      <div className="mb-6">
        <Link href="/employee">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employee Panel
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Expense Request</h1>
        <p className="text-muted-foreground">
          Submit a new expense reimbursement request
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 shadow-lg">
          <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 shadow-lg">
          <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Expense Request Form
          </CardTitle>
          <CardDescription>
            Fill in the details below to submit your expense request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  {...register("employeeId")}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-filled from session"
                />
                {errors.employeeId && (
                  <p className="text-sm text-red-600">{errors.employeeId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee Name</Label>
                <Input
                  id="employeeName"
                  {...register("employeeName")}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-filled from session"
                />
                {errors.employeeName && (
                  <p className="text-sm text-red-600">{errors.employeeName.message}</p>
                )}
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-2">
              <Label htmlFor="requestTitle">Request Title</Label>
              <Input
                id="requestTitle"
                {...register("requestTitle")}
                placeholder="Brief title for your expense request"
              />
              {errors.requestTitle && (
                <p className="text-sm text-red-600">{errors.requestTitle.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value="USD">
                  <SelectTrigger className="opacity-60 pointer-events-none">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={watch("department")}
                onValueChange={(value) => setValue("department", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Expense Category</Label>
                <Select
                  value={watch("expenseCategory")}
                  onValueChange={(value) => setValue("expenseCategory", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.expenseCategory && (
                  <p className="text-sm text-red-600">{errors.expenseCategory.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  {...register("expenseDate")}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.expenseDate && (
                  <p className="text-sm text-red-600">{errors.expenseDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-600">{errors.priority.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={4}
                placeholder="Provide detailed description of the expense..."
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt Upload</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="border-0 p-0"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload receipt (Image or PDF, max 5MB)
                    </p>
                  </div>
                </div>
                {receiptFile && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
              {!receiptFile && (
                <p className="text-sm text-red-600">Receipt upload is required</p>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href="/employee">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty || !receiptFile}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
