"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, UserPlus, Clock, CheckCircle, XCircle, History, Bell, FileText } from "lucide-react";

export default function EmployeePanel() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, Employee</h1>
            <p className="text-muted-foreground text-lg mt-1">
              Submit expense and onboarding requests.
            </p>
          </div>
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            EMPLOYEE
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Approved Requests</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Rejected Requests</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Action Cards Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Create New Request</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Expense Request Card */}
          <Card className="bg-card border-border shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
            <CardContent className="p-6 space-y-6">
              {/* Icon Container */}
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <Receipt className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-foreground">
                  Create Expense Request
                </h3>
                <p className="text-base text-muted-foreground font-medium">
                  Expense Approval Workflow
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Submit an expense with amount, department, priority, and receipt.
                </p>
              </div>
              
              {/* Button */}
              <Link href="/employee/expense-request">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-xl transition-colors duration-200">
                  Create Request
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Onboarding Request Card */}
          <Card className="bg-card border-border shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
            <CardContent className="p-6 space-y-6">
              {/* Icon Container */}
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-foreground">
                  Create Onboarding Request
                </h3>
                <p className="text-base text-muted-foreground font-medium">
                  Employee Onboarding Workflow
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Submit new hire details for HR verification and IT setup.
                </p>
              </div>
              
              {/* Button */}
              <Link href="/employee/onboarding-request">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-xl transition-colors duration-200">
                  Create Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Request Activity */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Recent Activity</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Requests Card */}
          <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-y-3">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Recent Requests</h3>
                  <p className="text-sm text-muted-foreground">View your submission history</p>
                </div>
              </div>
              <Link href="/employee/my-requests">
                <Button variant="outline" className="w-full mt-4">
                  <History className="mr-2 h-4 w-4" />
                  View All Requests
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-y-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
                  <p className="text-sm text-muted-foreground">Stay updated on your requests</p>
                </div>
              </div>
              <Link href="/employee/notifications">
                <Button variant="outline" className="w-full mt-4">
                  <Bell className="mr-2 h-4 w-4" />
                  View Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Audit Logs Card */}
          <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-y-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Audit Logs</h3>
                  <p className="text-sm text-muted-foreground">Track your activity history</p>
                </div>
              </div>
              <Link href="/employee/audit-logs">
                <Button variant="outline" className="w-full mt-4">
                  <FileText className="mr-2 h-4 w-4" />
                  View Audit Logs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
