"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, Globe, User, Clock, Plus } from "lucide-react";
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
  permission_type: "user" | "domain";
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface GrantedToMePermission {
  id: number;
  grantor_id: number;
  grantor_email: string;
  grantor_name: string;
  permission_type: "user" | "domain";
  status: string;
  expires_at: string | null;
  created_at: string;
}

export default function PermissionsPage() {
  const [permissionsIGranted, setPermissionsIGranted] = useState<Permission[]>([]);
  const [permissionsGrantedToMe, setPermissionsGrantedToMe] = useState<GrantedToMePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grantType, setGrantType] = useState<"email" | "domain">("email");
  const [grantValue, setGrantValue] = useState("");
  const [grantError, setGrantError] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [showGrantForm, setShowGrantForm] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const [grantedByMe, grantedToMe] = await Promise.all([
        fetch("/api/permissions/list"),
        fetch("/api/permissions/granted-to-me")
      ]);
      
      const grantedByMeData = await grantedByMe.json();
      const grantedToMeData = await grantedToMe.json();
      
      setPermissionsIGranted(grantedByMeData.permissions || []);
      setPermissionsGrantedToMe(grantedToMeData.permissions || []);
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

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantError("");
    
    if (!grantValue.trim()) {
      setGrantError("Please enter a value");
      return;
    }

    setIsGranting(true);
    
    try {
      const response = await fetch("/api/permissions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: grantType,
          value: grantValue.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGrantValue("");
        setShowGrantForm(false);
        fetchPermissions();
      } else {
        setGrantError(data.error || "Failed to grant access");
      }
    } catch (error) {
      console.error("Failed to grant access:", error);
      setGrantError("An error occurred while granting access");
    } finally {
      setIsGranting(false);
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case "domain":
        return <Globe className="w-4 h-4" />;
      case "user":
        return <User className="w-4 h-4" />;
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
    }

    if (permission.expires_at) {
      parts.push(`Expires ${format(new Date(permission.expires_at), "MMM d, yyyy")}`);
    }

    return parts.join(" • ");
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
          <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">Calendar Permissions</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage who can view your calendar availability
          </p>
        </div>

        <div className="space-y-6">
          {/* Permissions Granted TO Me */}
          <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Access I Have</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                People who have given you permission to view their calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
              ) : permissionsGrantedToMe.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No one has granted you calendar access yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {permissionsGrantedToMe.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm dark:text-gray-100">
                          {permission.grantor_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {permission.grantor_email}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Granted {format(new Date(permission.created_at), "MMM d, yyyy")}
                          {permission.expires_at && ` • Expires ${format(new Date(permission.expires_at), "MMM d, yyyy")}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions I Granted */}
          <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 dark:text-slate-100">Access I've Granted</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    People and domains who can view your calendar availability
                  </CardDescription>
                </div>
                {!showGrantForm && (
                  <Button
                    onClick={() => setShowGrantForm(true)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Grant Access
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Permission Form */}
              {showGrantForm && (
                <form onSubmit={handleGrantAccess} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold dark:text-gray-100">
                      Grant Access
                    </Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Proactively grant calendar access to specific people or entire domains
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="grantType"
                            value="email"
                            checked={grantType === "email"}
                            onChange={(e) => {
                              setGrantType(e.target.value as "email");
                              setGrantError("");
                            }}
                            className="text-blue-600"
                          />
                          <span className="text-sm dark:text-gray-200">Email</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="grantType"
                            value="domain"
                            checked={grantType === "domain"}
                            onChange={(e) => {
                              setGrantType(e.target.value as "domain");
                              setGrantError("");
                            }}
                            className="text-blue-600"
                          />
                          <span className="text-sm dark:text-gray-200">Domain</span>
                        </label>
                      </div>
                      
                      <Input
                        type="text"
                        placeholder={
                          grantType === "email"
                            ? "user@example.com"
                            : "company.com or @company.com"
                        }
                        value={grantValue}
                        onChange={(e) => {
                          setGrantValue(e.target.value);
                          setGrantError("");
                        }}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                      
                      {grantError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {grantError}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isGranting}
                        size="sm"
                      >
                        {isGranting ? "Granting..." : "Grant Access"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowGrantForm(false);
                          setGrantValue("");
                          setGrantError("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {grantType === "email" 
                      ? "The person must already have an account. They'll be notified when you grant access."
                      : "Everyone with this domain can view your calendar. Works best for company domains (not Gmail, Yahoo, etc.)."
                    }
                  </p>
                </div>
              </form>
              )}

              {/* Existing Permissions List */}
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
              ) : permissionsIGranted.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  You haven't granted anyone calendar access yet. Use the form above to add people or domains.
                </p>
              ) : (
                <div className="space-y-2">
                  {permissionsIGranted.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm dark:text-gray-100">
                          {getPermissionLabel(permission)}
                        </p>
                        {permission.grantee_info && (
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {permission.grantee_info.email}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Granted {format(new Date(permission.created_at), "MMM d, yyyy")}
                          {permission.expires_at && ` • Expires ${format(new Date(permission.expires_at), "MMM d, yyyy")}`}
                        </p>
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

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-sm dark:text-gray-100">How Permissions Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>
                <strong className="dark:text-gray-100">User access:</strong> A specific person can always see your availability when scheduling meetings.
              </p>
              <p>
                <strong className="dark:text-gray-100">Domain access:</strong> Everyone from a specific company domain (like @yourcompany.com) can see your availability.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

