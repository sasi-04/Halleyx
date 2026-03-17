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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toast } from "@/components/ui/toast";
import { Loader2, ArrowLeft, Users, Mail, Calendar, Laptop, Key, User, Briefcase, Building, Shield } from "lucide-react";
import Link from "next/link";

// Form validation schema
const onboardingRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  employeeName: z.string().min(1, "Employee name is required"),
  newEmployeeName: z.string().min(1, "New employee name is required"),
  email: z.string().email("Valid email is required"),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(["full_time", "contract", "intern"]),
  managerName: z.string().min(1, "Manager name is required"),
  laptopRequired: z.boolean(),
  accessNeeded: z.array(z.string()).min(1, "At least one access option is required"),
  priority: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

type OnboardingRequestForm = z.infer<typeof onboardingRequestSchema>;

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

const employmentTypes = [
  { value: "full_time", label: "Full Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" }
];

const accessOptions = [
  { id: "github", label: "GitHub", description: "Code repository access" },
  { id: "slack", label: "Slack", description: "Team communication" },
  { id: "jira", label: "Jira", description: "Project management" }
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

export default function OnboardingRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<OnboardingRequestForm>({
    resolver: zodResolver(onboardingRequestSchema),
    defaultValues: {
      employeeId: "",
      employeeName: "",
      newEmployeeName: "",
      email: "",
      position: "",
      department: "",
      joiningDate: "",
      employmentType: "full_time",
      managerName: "",
      laptopRequired: true,
      accessNeeded: [],
      priority: "medium",
      notes: "",
    },
  });

  // Get current user from session/local storage
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
          setValue("employeeId", user.sub || user.id || "");
          setValue("employeeName", user.name || "");
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      }
    };

    fetchCurrentUser();
  }, [router, setValue]);

  const validateJoiningDate = (dateString: string) => {
    const joiningDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    joiningDate.setHours(0, 0, 0, 0);
    return joiningDate > today;
  };

  const handleAccessChange = (accessId: string, checked: boolean) => {
    const currentAccess = watch("accessNeeded") || [];
    let newAccess: string[];
    
    if (checked) {
      newAccess = [...currentAccess, accessId];
    } else {
      newAccess = currentAccess.filter((id: string) => id !== accessId);
    }
    
    setValue("accessNeeded", newAccess);
  };

  const onSubmit = async (data: OnboardingRequestForm) => {
    // Additional validation for joining date
    if (!validateJoiningDate(data.joiningDate)) {
      setError("Joining date must be in the future");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/requests/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          request_type: "onboarding"
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setSuccess("Onboarding request submitted successfully!");
        setShowToast({ type: 'success', message: 'Onboarding request submitted successfully!' });
        
        // Redirect to my requests after 5 seconds
        setTimeout(() => {
          router.push("/employee/my-requests");
        }, 5000);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Failed to submit onboarding request";
        setError(errorMessage);
        setShowToast({ type: 'error', message: errorMessage });
      }
    } catch (error) {
      console.error("Error submitting onboarding request:", error);
      const errorMessage = error.name === 'AbortError' 
        ? "Request timed out. Please check your connection and try again."
        : "An unexpected error occurred. Please try again.";
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
        <h1 className="text-3xl font-bold">Onboarding Request</h1>
        <p className="text-muted-foreground">
          Submit a new employee onboarding request
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
            <Users className="mr-2 h-5 w-5" />
            Onboarding Request Form
          </CardTitle>
          <CardDescription>
            Fill in the details below to submit your onboarding request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Requester Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Requester Information</h3>
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
            </div>

            {/* New Employee Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">New Employee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmployeeName">New Employee Name</Label>
                  <Input
                    id="newEmployeeName"
                    {...register("newEmployeeName")}
                    placeholder="Full name of new employee"
                  />
                  {errors.newEmployeeName && (
                    <p className="text-sm text-red-600">{errors.newEmployeeName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="new.employee@company.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Role</Label>
                  <Input
                    id="position"
                    {...register("position")}
                    placeholder="Job title/position"
                  />
                  {errors.position && (
                    <p className="text-sm text-red-600">{errors.position.message}</p>
                  )}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Start Date</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    {...register("joiningDate")}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  />
                  {errors.joiningDate && (
                    <p className="text-sm text-red-600">{errors.joiningDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={watch("employmentType")}
                    onValueChange={(value) => setValue("employmentType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employmentType && (
                    <p className="text-sm text-red-600">{errors.employmentType.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerName">Manager</Label>
                <Input
                  id="managerName"
                  {...register("managerName")}
                  placeholder="Name of the hiring manager"
                />
                {errors.managerName && (
                  <p className="text-sm text-red-600">{errors.managerName.message}</p>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Requirements</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="laptopRequired"
                  checked={watch("laptopRequired")}
                  onCheckedChange={(checked) => setValue("laptopRequired", checked as boolean)}
                />
                <Label htmlFor="laptopRequired" className="flex items-center">
                  <Laptop className="mr-2 h-4 w-4" />
                  Laptop Required
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Access Required</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accessOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={watch("accessNeeded")?.includes(option.id)}
                        onCheckedChange={(checked) => handleAccessChange(option.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={option.id} className="font-medium">
                          {option.label}
                        </Label>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.accessNeeded && (
                  <p className="text-sm text-red-600">{errors.accessNeeded.message}</p>
                )}
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  rows={4}
                  placeholder="Any additional information or special requirements..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href="/employee">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
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
