"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";

interface AvailabilityRule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface BlockedTime {
  id: number;
  start_time: string;
  end_time: string;
  reason: string | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [newRule, setNewRule] = useState({
    day_of_week: "1",
    start_time: "09:00",
    end_time: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [newBlocked, setNewBlocked] = useState({
    start_time: "",
    end_time: "",
    reason: "",
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchRules();
    fetchBlockedTimes();
  }, []);

  const fetchCurrentUser = async () => {
    const response = await fetch("/api/auth/me");
    if (response.ok) {
      const data = await response.json();
      const tz = data.user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(tz);
      setNewRule(prev => ({ ...prev, timezone: tz }));
    }
  };

  const fetchRules = async () => {
    const response = await fetch("/api/availability/rules");
    const data = await response.json();
    setRules(data.rules);
  };

  const fetchBlockedTimes = async () => {
    const response = await fetch("/api/availability/blocked");
    const data = await response.json();
    setBlockedTimes(data.blockedTimes);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/availability/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_of_week: parseInt(newRule.day_of_week),
        start_time: newRule.start_time,
        end_time: newRule.end_time,
        timezone: newRule.timezone,
      }),
    });
    fetchRules();
  };

  const handleDeleteRule = async (id: number) => {
    await fetch(`/api/availability/rules?id=${id}`, { method: "DELETE" });
    fetchRules();
  };

  const handleAddBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/availability/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: new Date(newBlocked.start_time).toISOString(),
        end_time: new Date(newBlocked.end_time).toISOString(),
        reason: newBlocked.reason,
      }),
    });
    setNewBlocked({ start_time: "", end_time: "", reason: "" });
    fetchBlockedTimes();
  };

  const handleDeleteBlocked = async (id: number) => {
    await fetch(`/api/availability/blocked?id=${id}`, { method: "DELETE" });
    fetchBlockedTimes();
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    setUserTimezone(newTimezone);
    setNewRule(prev => ({ ...prev, timezone: newTimezone }));
    
    // Update user's timezone preference
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: newTimezone }),
    });
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
        <h2 className="text-3xl font-bold mb-6 dark:text-gray-100">Availability Settings</h2>

        <div className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Timezone</CardTitle>
              <CardDescription className="dark:text-gray-400">
                All your availability rules will use this timezone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="dark:text-gray-200">Current Timezone</Label>
                <select
                  id="timezone"
                  className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 px-3 py-2 text-sm"
                  value={userTimezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Phoenix">Arizona Time (MST)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Australia/Sydney">Sydney (AEDT)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your timezone: {userTimezone}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle>Weekly Availability Rules</CardTitle>
              <CardDescription>
                Set your regular weekly availability hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRule} className="space-y-4 mb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day">Day of Week</Label>
                    <select
                      id="day"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newRule.day_of_week}
                      onChange={(e) =>
                        setNewRule({ ...newRule, day_of_week: e.target.value })
                      }
                    >
                      {DAYS.map((day, index) => (
                        <option key={index} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newRule.start_time}
                      onChange={(e) =>
                        setNewRule({ ...newRule, start_time: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newRule.end_time}
                      onChange={(e) =>
                        setNewRule({ ...newRule, end_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button type="submit">Add Availability Rule</Button>
              </form>

              <div className="space-y-2">
                {rules.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No availability rules set. Add rules to control when you're
                    available.
                  </p>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm">
                        {DAYS[rule.day_of_week]}: {rule.start_time} -{" "}
                        {rule.end_time}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked Times</CardTitle>
              <CardDescription>
                Block specific times when you're unavailable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBlocked} className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blockedStart">Start Date & Time</Label>
                    <Input
                      id="blockedStart"
                      type="datetime-local"
                      value={newBlocked.start_time}
                      onChange={(e) =>
                        setNewBlocked({
                          ...newBlocked,
                          start_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blockedEnd">End Date & Time</Label>
                    <Input
                      id="blockedEnd"
                      type="datetime-local"
                      value={newBlocked.end_time}
                      onChange={(e) =>
                        setNewBlocked({ ...newBlocked, end_time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    type="text"
                    placeholder="Out of office, vacation, etc."
                    value={newBlocked.reason}
                    onChange={(e) =>
                      setNewBlocked({ ...newBlocked, reason: e.target.value })
                    }
                  />
                </div>

                <Button type="submit">Block Time</Button>
              </form>

              <div className="space-y-2">
                {blockedTimes.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No blocked times. Add specific times when you're unavailable.
                  </p>
                ) : (
                  blockedTimes.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(blocked.start_time).toLocaleString()} -{" "}
                          {new Date(blocked.end_time).toLocaleString()}
                        </p>
                        {blocked.reason && (
                          <p className="text-xs text-gray-500">{blocked.reason}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlocked(blocked.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

