"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailInput } from "@/components/ui/email-input";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { useTheme } from "@/hooks/use-theme";
import { LogOut, Settings, Moon, Sun, Calendar, Users, Shield, CalendarPlus, Bell, UserPlus } from "lucide-react";
import { format, addDays } from "date-fns";

interface User {
  id: number;
  email: string;
  name: string;
  hasGoogleCalendar: boolean;
  timezone?: string;
  show_weekends?: boolean;
  calendar_start_today?: boolean;
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
  
  // Find meeting state
  const [participantEmails, setParticipantEmails] = useState<string[]>([]);
  const [frequentContacts, setFrequentContacts] = useState<Array<{ email: string; name: string }>>([]);
  const [duration, setDuration] = useState("60");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isFindingTimes, setIsFindingTimes] = useState(false);
  const [findError, setFindError] = useState("");
  
  // Selected time slots from calendar
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  
  // Calendar time range
  const [calendarStartHour, setCalendarStartHour] = useState(8);
  const [calendarEndHour, setCalendarEndHour] = useState(18);
  
  // Timezone for calendar view
  const [viewTimezone, setViewTimezone] = useState<string>("");
  
  // Input focus state
  const [isParticipantInputFocused, setIsParticipantInputFocused] = useState(false);
  
  // Auto-suggested availability
  const [suggestedSlots, setSuggestedSlots] = useState<Date[]>([]);
  
  // Notifications state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEventName, setInviteEventName] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchFrequentContacts();
    fetchAvailabilityRange();
    fetchSuggestedAvailability();
    fetchUnreadNotifications();
  }, []);

  const fetchUnreadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        const unreadCount = data.notifications?.filter((n: any) => !n.read).length || 0;
        setUnreadNotificationsCount(unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (user?.email && participantEmails.length === 0) {
      setParticipantEmails([user.email]);
    }
    if (user?.timezone && !viewTimezone) {
      setViewTimezone(user.timezone);
    }
  }, [user]);

  const fetchFrequentContacts = async () => {
    try {
      const response = await fetch("/api/contacts/frequent");
      if (response.ok) {
        const data = await response.json();
        setFrequentContacts(data.contacts || []);
      }
    } catch (error) {
      console.error("Failed to fetch frequent contacts:", error);
    }
  };

  const fetchAvailabilityRange = async () => {
    try {
      const response = await fetch("/api/availability/range");
      if (response.ok) {
        const data = await response.json();
        setCalendarStartHour(data.startHour);
        setCalendarEndHour(data.endHour);
      }
    } catch (error) {
      console.error("Failed to fetch availability range:", error);
    }
  };

  const fetchSuggestedAvailability = async () => {
    try {
      const response = await fetch("/api/availability/suggested");
      if (response.ok) {
        const data = await response.json();
        setSuggestedSlots(data.suggestions.map((s: string) => new Date(s)));
      }
    } catch (error) {
      console.error("Failed to fetch suggested availability:", error);
    }
  };

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
      console.error("Error fetching user:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindTimes = async () => {
    setFindError("");
    setIsFindingTimes(true);

    if (participantEmails.length === 0) {
      setFindError("Add at least one participant");
      setIsFindingTimes(false);
      return;
    }

    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const response = await fetch("/api/meetings/find-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_emails: participantEmails,
          start_date: today.toISOString(),
          end_date: nextWeek.toISOString(),
          duration: parseInt(duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFindError(data.error || "Failed to find times");
        setIsFindingTimes(false);
        return;
      }

      setAvailableSlots(data.available_slots || []);
      
      // Update Quick Availability with found times
      if (data.available_slots && data.available_slots.length > 0) {
        const foundSlots = data.available_slots.map((slot: AvailableSlot) => new Date(slot.start));
        setSuggestedSlots(foundSlots);
      }
    } catch (error) {
      setFindError("An error occurred");
    } finally {
      setIsFindingTimes(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    
    setIsSendingInvite(true);
    
    try {
      let context = "";
      if (inviteEventName && inviteNote) {
        context = `${inviteEventName}: ${inviteNote}`;
      } else if (inviteEventName) {
        context = inviteEventName;
      } else if (inviteNote) {
        context = inviteNote;
      } else {
        context = "I'd like to grab your calendar availability";
      }
      
      const response = await fetch("/api/permissions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: inviteEmail.trim(),
          context: context,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Invitation sent successfully!");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteEventName("");
        setInviteNote("");
      } else {
        alert(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
      alert("An error occurred while sending the invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  function formatTimeInTimezone(date: Date, timezone: string): { hour: number; minute: number; period: string } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const period = parts.find(p => p.type === 'dayPeriod')?.value || 'am';
    return { hour, minute, period: period.toLowerCase() };
  }

  function formatGroupedSlots(slots: AvailableSlot[], timezone: string): string[] {
    const grouped = new Map<string, Date[]>();
    slots.forEach(slot => {
      const date = new Date(slot.start);
      // Format date in the target timezone
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateKey = dateFormatter.format(date).split('/').reverse().join('-');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(date);
    });
    const lines: string[] = [];
    grouped.forEach((times, dateKey) => {
      const firstTime = times[0];
      // Format day name and date in the target timezone
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        month: 'numeric',
        day: 'numeric',
      });
      const formatted = dayFormatter.format(firstTime);
      const [dayName, dateStr] = formatted.split(', ');
      
      const formattedTimes = times.map(time => {
        const { hour, minute, period } = formatTimeInTimezone(time, timezone);
        if (minute === 0) {
          return `${hour}${period}`;
        } else {
          return `${hour}:${String(minute).padStart(2, '0')}${period}`;
        }
      });
      let timesList: string;
      if (formattedTimes.length === 1) {
        timesList = formattedTimes[0];
      } else if (formattedTimes.length === 2) {
        timesList = formattedTimes.join(' or ');
      } else {
        const lastTime = formattedTimes.pop();
        timesList = formattedTimes.join(', ') + ' or ' + lastTime;
      }
      const tzMap: Record<string, string> = {
        'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
        'America/Los_Angeles': 'PT', 'America/Phoenix': 'MST', 'America/Anchorage': 'AKT',
        'Pacific/Honolulu': 'HST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
        'Europe/Berlin': 'CET', 'Asia/Tokyo': 'JST', 'Asia/Shanghai': 'CST', 
        'Asia/Kolkata': 'IST', 'Australia/Sydney': 'AEDT'
      };
      const tzAbbr = tzMap[timezone] || (timezone.includes('/') ? timezone.split('/').pop() || timezone : timezone);
      lines.push(`${dayName}, ${dateStr} at ${timesList} ${tzAbbr}`);
    });
    return lines;
  }

  function formatSelectedSlots(slots: Date[], timezone: string): string[] {
    if (slots.length === 0) return [];
    
    const grouped = new Map<string, Date[]>();
    slots.forEach(slot => {
      // Format date in the target timezone
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateKey = dateFormatter.format(slot).split('/').reverse().join('-');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot);
    });
    
    // Sort slots within each day
    grouped.forEach((times) => {
      times.sort((a, b) => a.getTime() - b.getTime());
    });
    
    const lines: string[] = [];
    const sortedDates = Array.from(grouped.keys()).sort();
    
    sortedDates.forEach((dateKey) => {
      const times = grouped.get(dateKey)!;
      const firstTime = times[0];
      // Format day name and date in the target timezone
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        month: 'numeric',
        day: 'numeric',
      });
      const formatted = dayFormatter.format(firstTime);
      const [dayName, dateStr] = formatted.split(', ');
      
      const formattedTimes = times.map(time => {
        const { hour, minute, period } = formatTimeInTimezone(time, timezone);
        if (minute === 0) {
          return `${hour}${period}`;
        } else {
          return `${hour}:${String(minute).padStart(2, '0')}${period}`;
        }
      });
      let timesList: string;
      if (formattedTimes.length === 1) {
        timesList = formattedTimes[0];
      } else if (formattedTimes.length === 2) {
        timesList = formattedTimes.join(' or ');
      } else {
        const lastTime = formattedTimes.pop();
        timesList = formattedTimes.join(', ') + ' or ' + lastTime;
      }
      const tzMap: Record<string, string> = {
        'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
        'America/Los_Angeles': 'PT', 'America/Phoenix': 'MST', 'America/Anchorage': 'AKT',
        'Pacific/Honolulu': 'HST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
        'Europe/Berlin': 'CET', 'Asia/Tokyo': 'JST', 'Asia/Shanghai': 'CST', 
        'Asia/Kolkata': 'IST', 'Australia/Sydney': 'AEDT'
      };
      const tzAbbr = tzMap[timezone] || (timezone.includes('/') ? timezone.split('/').pop() || timezone : timezone);
      lines.push(`${dayName}, ${dateStr} at ${timesList} ${tzAbbr}`);
    });
    return lines;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 dark:bg-blue-950/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/40 dark:bg-purple-950/40 rounded-full blur-3xl"></div>
      </div>

      {/* Compact Header */}
      <nav className="relative z-10 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="10" height="10" rx="2" className="fill-slate-700 dark:fill-slate-300" />
                <rect x="18" y="4" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
                <rect x="4" y="18" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
                <rect x="18" y="18" width="10" height="10" rx="2" className="fill-slate-400 dark:fill-slate-500" opacity="0.5" />
              </svg>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Booker</h1>
            </Link>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowInviteModal(true)}
                title="Request Availability"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <Link href="/permissions">
                <Button variant="ghost" size="sm" title="Permissions">
                  <Shield className="w-4 h-4" />
                </Button>
          </Link>
            <Link href="/availability">
                <Button variant="ghost" size="sm" title="Settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
              <Link href="/notifications">
                <Button 
                  variant="ghost" 
                  size="sm"
                  title="Notifications"
                  className="relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={toggleTheme} title="Toggle theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 relative z-0">
            {/* Welcome */}
            {!user?.hasGoogleCalendar && (
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm dark:text-gray-100">Connect Your Calendar</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Link Google Calendar to auto-fill availability and save time
                    </p>
                  </div>
                  <Link href="/api/auth/google">
                    <Button size="sm">Connect</Button>
                  </Link>
                    </div>
              </Card>
            )}

            {/* Weekly Calendar */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">Availability</h2>
                
                {/* Subtle Timezone Picker */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Target Timezone:
                  </label>
                  <select
                    value={viewTimezone}
                    onChange={(e) => setViewTimezone(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="America/New_York">ET (Eastern)</option>
                    <option value="America/Chicago">CT (Central)</option>
                    <option value="America/Denver">MT (Mountain)</option>
                    <option value="America/Phoenix">MST (Arizona)</option>
                    <option value="America/Los_Angeles">PT (Pacific)</option>
                    <option value="America/Anchorage">AKT (Alaska)</option>
                    <option value="Pacific/Honolulu">HST (Hawaii)</option>
                    <option value="Europe/London">GMT (London)</option>
                    <option value="Europe/Paris">CET (Paris)</option>
                    <option value="Europe/Berlin">CET (Berlin)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                    <option value="Asia/Shanghai">CST (Shanghai)</option>
                    <option value="Asia/Kolkata">IST (India)</option>
                    <option value="Australia/Sydney">AEDT (Sydney)</option>
                  </select>
                </div>
              </div>
              <WeeklyCalendar 
                selectedSlots={selectedSlots}
                onSlotSelect={setSelectedSlots}
                showWeekends={user?.show_weekends || false}
                startHour={calendarStartHour}
                endHour={calendarEndHour}
                userTimezone={user?.timezone || 'America/New_York'}
                calendarStartToday={user?.calendar_start_today || false}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 relative z-0">
            {/* Find Times */}
            <Card className="p-4 relative z-0">
              <h2 className="text-base font-semibold mb-3 dark:text-gray-100">Find Time</h2>
              
              <div className="space-y-3">
                  <div>
                  <label className="text-xs font-medium mb-1.5 block dark:text-gray-200">Participants</label>
                  <div 
                    onFocus={() => setIsParticipantInputFocused(true)}
                    onBlur={() => setTimeout(() => setIsParticipantInputFocused(false), 200)}
                  >
                    <EmailInput
                      emails={participantEmails}
                      onChange={setParticipantEmails}
                      placeholder="Add emails..."
                      userEmail={user?.email}
                    />
                  </div>
                  {isParticipantInputFocused && frequentContacts.length > 0 && (
                    <div className="mt-1.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequent:</p>
                      <div className="flex flex-wrap gap-1">
                        {frequentContacts.slice(0, 3).map((contact) => (
                          !participantEmails.includes(contact.email) && (
                            <button
                              key={contact.email}
                              onClick={() => setParticipantEmails([...participantEmails, contact.email])}
                              className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full dark:text-slate-200"
                            >
                              + {contact.email}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                    </div>

                {participantEmails.length > 1 && (
                  <>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block dark:text-gray-200">Duration</label>
                      <select
                        className="flex h-8 w-full rounded-md border border-input bg-background dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 px-2 text-xs"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        <option value="30">30 min</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>
                      </div>
                      
                    {findError && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded text-xs">
                        {findError}
                      </div>
                    )}

                    <Button 
                      onClick={handleFindTimes}
                      disabled={isFindingTimes}
                      className="w-full"
                      size="sm" 
                    >
                      {isFindingTimes ? "Finding..." : "Find Times"}
                    </Button>
                  </>
                )}

                {availableSlots.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t dark:border-gray-700">
                    <p className="text-xs font-medium dark:text-gray-200">
                      Available ({availableSlots.length})
                    </p>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {formatGroupedSlots(availableSlots, viewTimezone || user?.timezone || 'ET').map((line, index) => (
                        <div
                          key={index}
                          className="p-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs dark:text-gray-200"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Auto-Suggested Availability */}
            {suggestedSlots.length > 0 && (
              <Card className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 relative z-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {availableSlots.length > 0 ? 'Common Availability' : 'Quick Availability'}
                  </h3>
                  <button
                    onClick={() => {
                      const text = formatSelectedSlots(suggestedSlots, viewTimezone || user?.timezone || 'ET').join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {formatSelectedSlots(suggestedSlots, viewTimezone || user?.timezone || 'ET').map((line, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    >
                      • {line}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Selected Times */}
            {selectedSlots.length > 0 && (
              <Card className="p-3 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 relative z-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Selected Times ({selectedSlots.length})
                  </h3>
                  <button
                    onClick={() => {
                      const text = formatSelectedSlots(selectedSlots, viewTimezone || user?.timezone || 'ET').join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {formatSelectedSlots(selectedSlots, viewTimezone || user?.timezone || 'ET').map((line, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    >
                      • {line}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Request Availability</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block dark:text-gray-200">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block dark:text-gray-200">
                  Event Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={inviteEventName}
                  onChange={(e) => setInviteEventName(e.target.value)}
                  placeholder="e.g., Coffee Chat, Quick Sync"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block dark:text-gray-200">
                  Note <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Add a personal message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {!inviteEventName && !inviteNote 
                  ? "An email will be sent saying you'd like to grab their calendar availability."
                  : "Your custom message will be included in the invitation."}
              </p>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteEventName("");
                  setInviteNote("");
                }}
                variant="outline"
                className="flex-1"
                disabled={isSendingInvite}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                className="flex-1"
                disabled={isSendingInvite || !inviteEmail.trim()}
              >
                {isSendingInvite ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
