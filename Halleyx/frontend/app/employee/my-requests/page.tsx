"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { 
  FileText, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Eye,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";

interface Request {
  id: string;
  request_type: "expense" | "onboarding";
  status: "pending" | "approved" | "rejected" | "in_progress";
  created_at: string;
  request_data: any;
}

export default function MyRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get("/employee/requests");
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(req => req.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRequests.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedRequests.length} request(s)?`)) {
      return;
    }

    try {
      const deletePromises = selectedRequests.map((requestId) =>
        api.delete(`/employee/requests/${requestId}`),
      );

      await Promise.all(deletePromises);
      
      // Remove deleted requests from state
      setRequests(prev => prev.filter(req => !selectedRequests.includes(req.id)));
      setSelectedRequests([]);
      
      // Refetch to ensure sync
      fetchRequests();
    } catch (error) {
      console.error("Error deleting requests:", error);
      alert("Failed to delete requests. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">
            Track all your submitted requests
          </p>
        </div>
        <Link href="/employee">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employee Panel
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {["all", "pending", "approved", "rejected", "in_progress"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                {filteredRequests.length} {filter === "all" ? "total" : filter} requests
              </CardDescription>
            </div>
            {selectedRequests.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRequests.length} selected
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {filter === "all" ? "No requests found" : `No ${filter} requests found`}
              </p>
              <div className="space-x-2">
                <Link href="/employee/expense-request">
                  <Button variant="outline">Submit Expense Request</Button>
                </Link>
                <Link href="/employee/onboarding-request">
                  <Button variant="outline">Submit Onboarding Request</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Select All Header */}
              {filteredRequests.length > 0 && (
                <div className="flex items-center space-x-3 pb-3 mb-3 border-b">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedRequests.length === filteredRequests.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>
                      {selectedRequests.length === filteredRequests.length ? "Deselect All" : "Select All"}
                    </span>
                  </button>
                </div>
              )}
              
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                      selectedRequests.includes(request.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => handleSelectRequest(request.id)}
                          className="mt-1 flex-shrink-0"
                        >
                          {selectedRequests.includes(request.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {request.request_type === "expense" ? (
                              <DollarSign className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Users className="h-5 w-5 text-green-600" />
                            )}
                            <h3 className="font-semibold">
                              {request.request_type === "expense" 
                                ? request.request_data?.requestTitle || "Expense Request"
                                : `Onboarding: ${request.request_data?.newEmployeeName || "New Employee"}`
                              }
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {formatDate(request.created_at)}</span>
                            </div>
                            
                            {request.request_type === "expense" && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4" />
                                <span>Amount: ${request.request_data?.amount || 0}</span>
                              </div>
                            )}
                            
                            {request.request_type === "onboarding" && (
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Position: {request.request_data?.position || "N/A"}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status.replace("_", " ")}</span>
                            </div>
                          </div>
                          
                          {request.request_type === "expense" && request.request_data?.description && (
                            <p className="mt-2 text-sm text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {request.request_data.description}
                            </p>
                          )}
                          
                          {request.request_type === "onboarding" && request.request_data?.department && (
                            <p className="mt-2 text-sm text-gray-600">
                              Department: {request.request_data.department}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col space-y-2">
                        <Link href={`/requests/${request.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this request?")) return;
                            try {
                              await api.delete(`/employee/requests/${request.id}`);
                              setRequests((prev) => prev.filter((r) => r.id !== request.id));
                              setSelectedRequests((prev) => prev.filter((id) => id !== request.id));
                            } catch (error: any) {
                              console.error("Error deleting request:", error);
                              alert(
                                error?.response?.data?.error ||
                                  error?.message ||
                                  "Failed to delete request. Please try again.",
                              );
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
