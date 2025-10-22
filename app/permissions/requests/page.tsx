"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, X, Globe, User, Clock } from "lucide-react";
import { format } from "date-fns";

interface PermissionRequest {
  id: number;
  requester_id: number;
  requester?: {
    id: number;
    name: string;
    email: string;
  } | null;
  meeting_context: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function PermissionRequestsPage() {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/permissions/requests");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: number, permissionType: "once" | "user" | "domain") => {
    try {
      const response = await fetch("/api/permissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, permission_type: permissionType }),
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleDeny = async (requestId: number) => {
    try {
      const response = await fetch("/api/permissions/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to deny request:", error);
    }
  };

  const extractDomain = (email: string) => {
    return email.split("@")[1];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2 dark:text-gray-100">Permission Requests</h2>
          <p className="text-gray-600 dark:text-gray-300">
            People who want to view your calendar availability
          </p>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              Choose how much access to grant each person
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No pending permission requests. When someone tries to schedule a meeting with you, they'll appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                  >
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg">
                        {request.requester?.name || request.requester?.email || "Unknown user"}
                      </h3>
                      {request.requester?.name && (
                        <p className="text-sm text-gray-500">{request.requester.email}</p>
                      )}
                      {request.meeting_context && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Context:</strong> {request.meeting_context}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Requested {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                        {" • "}
                        Expires {format(new Date(request.expires_at), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Grant access:
                      </p>
                      
                      <div className="grid gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request.id, "once")}
                          className="justify-start"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          <div className="text-left flex-1">
                            <div className="font-medium">One-time access</div>
                            <div className="text-xs text-gray-500">For this meeting only (expires in 7 days)</div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request.id, "user")}
                          className="justify-start"
                        >
                          <User className="w-4 h-4 mr-2" />
                          <div className="text-left flex-1">
                            <div className="font-medium">Always allow this person</div>
                            <div className="text-xs text-gray-500">
                              {request.requester?.email} can always see your calendar
                            </div>
                          </div>
                        </Button>

                        {request.requester?.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id, "domain")}
                            className="justify-start"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            <div className="text-left flex-1">
                              <div className="font-medium">Trust entire domain</div>
                              <div className="text-xs text-gray-500">
                                Everyone at @{extractDomain(request.requester.email)} can see your calendar
                              </div>
                            </div>
                          </Button>
                        )}
                      </div>

                      <div className="pt-2 border-t mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeny(request.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny Request
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

