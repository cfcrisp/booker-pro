"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bell, Shield, Calendar, Check } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notification_id: notificationId }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Bell className="w-8 h-8" />
              All Notifications
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              <Check className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  No notifications yet
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  When people request access to your calendar or grant you permissions, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {notification.type === 'permission_request' && (
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        {notification.type === 'permission_granted' && (
                          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {notification.type === 'meeting_request' && (
                          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        {!['permission_request', 'permission_granted', 'meeting_request'].includes(notification.type) && (
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <Bell className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {format(new Date(notification.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {!notification.read && (
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">New</span>
                              </div>
                            )}
                          </div>
                        </div>
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

