"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 dark:text-gray-300" />
            <CardTitle className="text-base dark:text-gray-100">Notifications</CardTitle>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs">
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="font-medium text-gray-700 dark:text-gray-200">🎉 All caught up!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-2 rounded border ${
                  notification.read 
                    ? "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600" 
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs dark:text-gray-100 truncate">{notification.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {format(new Date(notification.created_at), "MMM d 'at' h:mm a")}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="shrink-0 h-6 w-6 p-0"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {notification.link && (
                  <Link href={notification.link}>
                    <Button variant="link" size="sm" className="px-0 h-auto text-xs mt-1">
                      View →
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
        {notifications.length > 5 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Showing 5 of {notifications.length}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

