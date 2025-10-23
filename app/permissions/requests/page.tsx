"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Globe, UserPlus } from "lucide-react";
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

  const handleApprove = async (requestId: number, permissionType: "user" | "domain", email?: string) => {
    try {
      const body: any = { 
        request_id: requestId, 
        permission_type: permissionType 
      };
      
      // If domain permission, extract and include the domain
      if (permissionType === "domain" && email) {
        body.domain = extractDomain(email);
      }
      
      const response = await fetch("/api/permissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        fetchRequests();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("An error occurred while approving the request");
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

  const isPersonalEmail = (email: string) => {
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
      'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
      'protonmail.com', 'proton.me', 'mail.com', 'yandex.com', 'zoho.com',
      'gmx.com', 'gmx.net', 'inbox.com', 'mail.ru', 'qq.com',
      '163.com', '126.com', 'yeah.net'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return personalDomains.includes(domain);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 dark:bg-blue-950/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/40 dark:bg-purple-950/40 rounded-full blur-3xl"></div>
      </div>

      <nav className="relative z-10 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">Permission Requests</h2>
          <p className="text-slate-600 dark:text-slate-400">
            People who want to view your calendar availability
          </p>
        </div>

        <div>
            {isLoading ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No pending permission requests. When someone tries to schedule a meeting with you, they'll appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
                        {(request.requester?.name || request.requester?.email || "?").charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                              {request.requester?.name || request.requester?.email || "Unknown user"}
                            </h3>
                            {request.requester?.name && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">{request.requester.email}</p>
                            )}
                            {request.meeting_context && (
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
                                "{request.meeting_context}"
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {format(new Date(request.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id, "user")}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <UserPlus className="w-4 h-4 mr-1.5" />
                            Accept
                          </Button>
                          
                          {request.requester?.email && !isPersonalEmail(request.requester.email) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(request.id, "domain", request.requester?.email)}
                              className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            >
                              <Globe className="w-4 h-4 mr-1.5" />
                              Accept + Trust @{extractDomain(request.requester.email)}
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeny(request.id)}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            Ignore
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

