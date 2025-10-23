"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      const response = await fetch("/api/auth/google-signin");
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      setError("Failed to initiate Google Sign-In");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors px-4 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 dark:bg-blue-950/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/40 dark:bg-purple-950/40 rounded-full blur-3xl"></div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700 relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <svg width="96" height="96" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="10" height="10" rx="2" className="fill-slate-700 dark:fill-slate-300" />
              <rect x="18" y="4" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
              <rect x="4" y="18" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
              <rect x="18" y="18" width="10" height="10" rx="2" className="fill-slate-400 dark:fill-slate-500" opacity="0.5" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold dark:text-gray-100">Welcome to Booker</CardTitle>
          <CardDescription className="text-base mt-2 dark:text-gray-300">
            Sign in with your Google account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="button"
              className="w-full h-12 text-base"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="white"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="white"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="white"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              By signing in, you agree to connect your Google Calendar and allow
              Booker to access your calendar availability.
            </div>

            <div className="text-center">
              <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                ← Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
