"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Globe, User, Clock } from "lucide-react";
import { format } from "date-fns";

interface Permission {
  id: number;
  grantee_id: number | null;
  grantee_domain: string | null;
  grantee_info?: {
    id: number;
    name: string;
    email: string;
  } | null;
  permission_type: "once" | "user" | "domain";
  status: string;
  expires_at: string | null;
  created_at: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/permissions/list");
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this permission?")) {
      return;
    }

    try {
      const response = await fetch("/api/permissions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_id: id }),
      });

      if (response.ok) {
        fetchPermissions();
      }
    } catch (error) {
      console.error("Failed to revoke permission:", error);
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case "domain":
        return <Globe className="w-4 h-4" />;
      case "user":
        return <User className="w-4 h-4" />;
      case "once":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPermissionLabel = (permission: Permission) => {
    switch (permission.permission_type) {
      case "domain":
        return `Everyone at @${permission.grantee_domain}`;
      case "user":
        return permission.grantee_info?.email || "Specific user";
      case "once":
        return `${permission.grantee_info?.email || "User"} (One-time access)`;
      default:
        return "Unknown";
    }
  };

  const getPermissionDescription = (permission: Permission) => {
    const parts = [];
    
    if (permission.permission_type === "domain") {
      parts.push(`Anyone with an @${permission.grantee_domain} email can view your calendar`);
    } else if (permission.permission_type === "user") {
      parts.push("Can always view your calendar availability");
    } else if (permission.permission_type === "once") {
      parts.push("Single meeting access");
    }

    if (permission.expires_at) {
      parts.push(`Expires ${format(new Date(permission.expires_at), "MMM d, yyyy")}`);
    }

    return parts.join(" • ");
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
          <h2 className="text-3xl font-bold mb-2 dark:text-gray-100">Calendar Permissions</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage who can view your calendar availability
          </p>
        </div>

        <div className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle>Granted Permissions</CardTitle>
              <CardDescription>
                You've given these people or domains access to view your calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : permissions.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  You haven't granted any calendar permissions yet. When someone requests access to your calendar, you can approve it and it will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1 text-gray-600">
                          {getPermissionIcon(permission.permission_type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {getPermissionLabel(permission)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getPermissionDescription(permission)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Granted {format(new Date(permission.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(permission.id)}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm">How Permissions Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>One-time access:</strong> Someone can view your calendar for a single meeting request. Expires after 7 days.
              </p>
              <p>
                <strong>User access:</strong> A specific person can always see your availability when scheduling meetings.
              </p>
              <p>
                <strong>Domain access:</strong> Everyone from a specific company domain (like @yourcompany.com) can see your availability.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

