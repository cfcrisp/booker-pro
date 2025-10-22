"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/ui/email-input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useTheme } from "@/hooks/use-theme";
import { Calendar, LogOut, Settings, X, Globe, User as UserIcon, Clock, Moon, Sun, Send } from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

interface User {
  id: number;
  email: string;
  name: string;
  hasGoogleCalendar: boolean;
}

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

interface AvailableSlot {
  start: string;
  end: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  
  // Find meeting state
  const [participantEmails, setParticipantEmails] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfDay(new Date()),
    end: endOfDay(addDays(new Date(), 7)),
  });
  const [duration, setDuration] = useState("60");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isFindingTimes, setIsFindingTimes] = useState(false);
  const [findError, setFindError] = useState("");
  const [showResults, setShowResults] = useState(false);
  
  // Permission invitations state
  const [permissionTab, setPermissionTab] = useState<"send" | "pending">("send");
  const [requestEmails, setRequestEmails] = useState<string[]>([]);
  const [requestContext, setRequestContext] = useState("");
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  useEffect(() => {
    fetchUser();
    fetchPendingRequests();
    fetchSentRequests();
  }, []);

  useEffect(() => {
    if (user?.email && participantEmails.length === 0) {
      setParticipantEmails([user.email]);
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      
      if (!response.ok) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("/api/permissions/requests");
      if (response.ok) {
        const data = await response.json();
        setPermissionRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const response = await fetch("/api/permissions/sent-requests");
      if (response.ok) {
        const data = await response.json();
        setSentRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch sent requests:", error);
    }
  };

  const handleApproveRequest = async (requestId: number, permissionType: "once" | "user" | "domain") => {
    try {
      const response = await fetch("/api/permissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, permission_type: permissionType }),
      });

      if (response.ok) {
        fetchPendingRequests();
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleDenyRequest = async (requestId: number) => {
    try {
      const response = await fetch("/api/permissions/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (response.ok) {
        fetchPendingRequests();
      }
    } catch (error) {
      console.error("Failed to deny request:", error);
    }
  };

  const handleSendPermissionRequest = async () => {
    setRequestError("");
    setRequestSuccess("");
    
    if (requestEmails.length === 0) {
      setRequestError("Please add at least one email");
      return;
    }

    setIsSendingRequest(true);

    try {
      // Send request to each email
      const promises = requestEmails.map(async (email) => {
        const response = await fetch("/api/permissions/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_email: email,
            context: requestContext || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to send request to ${email}`);
        }

        return response.json();
      });

      await Promise.all(promises);

      setRequestSuccess(`Request sent to ${requestEmails.length} ${requestEmails.length === 1 ? 'person' : 'people'}`);
      setRequestEmails([]);
      setRequestContext("");
      
      // Refresh sent requests
      fetchSentRequests();

      // Clear success message after 3 seconds
      setTimeout(() => setRequestSuccess(""), 3000);
    } catch (error: any) {
      console.error("Failed to send permission request:", error);
      setRequestError(error.message || "Failed to send request");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleFindTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindError("");
    setIsFindingTimes(true);
    setShowResults(false);

    if (participantEmails.length === 0) {
      setFindError("Please add at least one participant");
      setIsFindingTimes(false);
      return;
    }

    try {
      const response = await fetch("/api/meetings/find-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_emails: participantEmails,
          start_date: dateRange.start.toISOString(),
          end_date: dateRange.end.toISOString(),
          duration: parseInt(duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFindError(data.error || "Failed to find meeting times");
        setIsFindingTimes(false);
        return;
      }

      setAvailableSlots(data.availableSlots || []);
      setParticipants(data.participants || []);
      setShowResults(true);
    } catch (error) {
      console.error("Find times error:", error);
      setFindError("Failed to find meeting times");
    } finally {
      setIsFindingTimes(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to initiate Google OAuth:", error);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 transition-colors">
      {/* Header */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b dark:border-gray-700 sticky top-0 z-50 transition-colors">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center">
            <Image 
              src="/logo-full.png" 
              alt="Booker Pro" 
              width={350} 
              height={140}
              className="h-16 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Link href="/availability">
              <Button variant="ghost" size="sm" title="Settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Calendar Connection Alert */}
        {!user.hasGoogleCalendar && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 shadow-sm">
            <p className="text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>Action Required:</strong> Connect your Google Calendar to start using Booker
            </p>
            <Button onClick={handleConnectGoogle} size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Find Meeting Times */}
            <Card className="shadow-md border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl dark:text-gray-100">Find Meeting Times</CardTitle>
                <CardDescription className="dark:text-gray-400">Enter participants and find when everyone is available</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFindTimes} className="space-y-4">
                  {findError && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                      {findError}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-2 block dark:text-gray-200">Participants</label>
                    <EmailInput
                      emails={participantEmails}
                      onChange={setParticipantEmails}
                      placeholder="Type email and press Enter..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block dark:text-gray-200">Timeframe</label>
                      <CalendarComponent
                        selectedRange={dateRange}
                        onRangeSelect={setDateRange}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block dark:text-gray-200">Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 px-3 text-sm"
                      >
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>

                      {showResults && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium dark:text-gray-200">
                            Available Slots ({availableSlots.length})
                          </p>
                          {availableSlots.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No common availability found</p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {availableSlots.map((slot, index) => (
                                <div
                                  key={index}
                                  className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm dark:text-gray-200"
                                >
                                  {format(new Date(slot.start), "EEE, MMM d 'at' h:mm a")} -{" "}
                                  {format(new Date(slot.end), "h:mm a")}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!user.hasGoogleCalendar || isFindingTimes}
                  >
                    {isFindingTimes ? "Searching..." : "Find Available Times"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Permission Requests */}
            {permissionRequests.length > 0 && (
              <Card className="shadow-md border-0 dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 dark:text-gray-100">
                    Permission Requests
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {permissionRequests.length}
                    </span>
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">People requesting access to your calendar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {permissionRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="mb-3">
                        <p className="font-semibold dark:text-gray-100">
                          {request.requester?.name || request.requester?.email}
                        </p>
                        {request.meeting_context && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.meeting_context}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveRequest(request.id, "once")}
                          className="text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          One-time
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveRequest(request.id, "user")}
                          className="text-xs"
                        >
                          <UserIcon className="w-3 h-3 mr-1" />
                          Always
                        </Button>
                        {request.requester?.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveRequest(request.id, "domain")}
                            className="text-xs"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            Domain
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDenyRequest(request.id)}
                          className="text-red-600 hover:bg-red-50 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                  {permissionRequests.length > 3 && (
                    <Link href="/permissions/requests">
                      <Button variant="link" className="w-full">
                        View all {permissionRequests.length} requests →
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Permission Requests to Send */}
            <Card className="shadow-md border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg dark:text-gray-100">Calendar Access</CardTitle>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant={permissionTab === "send" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPermissionTab("send")}
                    className="flex-1"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Request
                  </Button>
                  <Button
                    variant={permissionTab === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPermissionTab("pending")}
                    className="flex-1"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Sent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {permissionTab === "send" ? (
                  <div className="space-y-3">
                    {requestError && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded text-xs">
                        {requestError}
                      </div>
                    )}
                    {requestSuccess && (
                      <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2 rounded text-xs">
                        {requestSuccess}
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium mb-1 block dark:text-gray-200">Request calendar access from:</label>
                      <EmailInput
                        emails={requestEmails}
                        onChange={setRequestEmails}
                        placeholder="Type email and press Enter..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block dark:text-gray-200">Context (optional)</label>
                      <Input
                        placeholder="For upcoming team meeting..."
                        value={requestContext}
                        onChange={(e) => setRequestContext(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={handleSendPermissionRequest}
                      disabled={isSendingRequest || requestEmails.length === 0}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {isSendingRequest ? "Sending..." : "Send Request"}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      They'll be notified and can approve or deny your request.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentRequests.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No pending requests
                      </p>
                    ) : (
                      sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
                        >
                          <p className="text-xs font-medium dark:text-gray-200">
                            {request.recipient?.name || request.recipient?.email || request.recipient_email}
                          </p>
                          {request.pending_signup && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ⏳ Hasn't signed up yet
                            </p>
                          )}
                          {request.meeting_context && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {request.meeting_context}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {format(new Date(request.created_at), "MMM d")} · Pending
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <div className="lg:sticky lg:top-24">
              <NotificationsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

