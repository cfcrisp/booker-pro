"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Settings } from "lucide-react";

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

// Convert 24-hour time string (e.g., "17:00") to 12-hour format (e.g., "5:00 PM")
function formatTime12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [bufferMinutes, setBufferMinutes] = useState(30);
  const [showWeekends, setShowWeekends] = useState(false);
  const [calendarStartToday, setCalendarStartToday] = useState(false);
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
      const buffer = data.user.buffer_minutes ?? 30;
      const weekends = data.user.show_weekends ?? false;
      const startToday = data.user.calendar_start_today ?? false;
      setUserTimezone(tz);
      setBufferMinutes(buffer);
      setShowWeekends(weekends);
      setCalendarStartToday(startToday);
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

  const handleBufferChange = async (newBuffer: number) => {
    setBufferMinutes(newBuffer);
    
    // Update user's buffer preference
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buffer_minutes: newBuffer }),
    });
  };

  const handleWeekendsChange = async (enabled: boolean) => {
    setShowWeekends(enabled);
    
    // Update user's weekend preference
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_weekends: enabled }),
    });
  };

  const handleCalendarStartChange = async (startToday: boolean) => {
    setCalendarStartToday(startToday);
    
    // Update user's calendar start preference
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendar_start_today: startToday }),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 dark:bg-blue-950/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/40 dark:bg-purple-950/40 rounded-full blur-3xl"></div>
      </div>

      <nav className="relative z-10 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Availability Settings</h2>

        <div className="space-y-6">
          <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">General Settings</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Configure your timezone and meeting preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-slate-700 dark:text-slate-200">Timezone</Label>
                <select
                  id="timezone"
                  className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-gray-700/50 dark:border-gray-600 dark:text-slate-100 px-3 py-2 text-sm"
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
                  All times will be shown in {userTimezone}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer" className="dark:text-gray-200">Buffer Between Meetings</Label>
                <select
                  id="buffer"
                  className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-gray-700/50 dark:border-gray-600 dark:text-slate-100 px-3 py-2 text-sm"
                  value={bufferMinutes}
                  onChange={(e) => handleBufferChange(parseInt(e.target.value))}
                >
                  <option value="0">No buffer</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes (recommended)</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add padding before and after meetings to avoid back-to-back calls
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(e) => handleWeekendsChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  <div>
                    <span className="text-sm font-medium dark:text-gray-200">Show weekends in calendar</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, week starts on Sunday. When disabled, only weekdays are shown.
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calendarStartToday}
                    onChange={(e) => handleCalendarStartChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  <div>
                    <span className="text-sm font-medium dark:text-gray-200">Start calendar with today</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, calendar starts with today. When disabled, calendar starts with Monday or Sunday.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Weekly Availability Rules</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Set your regular weekly availability hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRule} className="space-y-4 mb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day" className="dark:text-gray-200">Day of Week</Label>
                    <select
                      id="day"
                      className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-gray-700/50 dark:border-gray-600 dark:text-slate-100 px-3 py-2 text-sm"
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
                    <Label htmlFor="startTime" className="dark:text-gray-200">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      value={newRule.start_time}
                      onChange={(e) =>
                        setNewRule({ ...newRule, start_time: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="dark:text-gray-200">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No availability rules set. Add rules to control when you're
                    available.
                  </p>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <span className="text-sm dark:text-gray-200">
                        {DAYS[rule.day_of_week]}: {formatTime12Hour(rule.start_time)} -{" "}
                        {formatTime12Hour(rule.end_time)}
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

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Blocked Times</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Block specific times when you're unavailable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBlocked} className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blockedStart" className="dark:text-gray-200">Start Date & Time</Label>
                    <Input
                      id="blockedStart"
                      type="datetime-local"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                    <Label htmlFor="blockedEnd" className="dark:text-gray-200">End Date & Time</Label>
                    <Input
                      id="blockedEnd"
                      type="datetime-local"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      value={newBlocked.end_time}
                      onChange={(e) =>
                        setNewBlocked({ ...newBlocked, end_time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="dark:text-gray-200">Reason (optional)</Label>
                  <Input
                    id="reason"
                    type="text"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No blocked times. Add specific times when you're unavailable.
                  </p>
                ) : (
                  blockedTimes.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">
                          {new Date(blocked.start_time).toLocaleString()} -{" "}
                          {new Date(blocked.end_time).toLocaleString()}
                        </p>
                        {blocked.reason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{blocked.reason}</p>
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

