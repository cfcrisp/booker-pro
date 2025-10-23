"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex flex-col transition-colors">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/40 dark:bg-blue-950/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/40 dark:bg-purple-950/40 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="10" height="10" rx="2" className="fill-slate-700 dark:fill-slate-300" />
              <rect x="18" y="4" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
              <rect x="4" y="18" width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" opacity="0.7" />
              <rect x="18" y="18" width="10" height="10" rx="2" className="fill-slate-400 dark:fill-slate-500" opacity="0.5" />
            </svg>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">Booker</span>
          </Link>
          <div className="flex gap-3 items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Link href="/login">
              <Button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 border-0">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-7xl font-bold mb-6 text-slate-900 dark:text-slate-50">
            Availability Made Easy
          </h1>
          <p className="text-2xl text-slate-600 dark:text-slate-400 mb-12 font-light">
            The fastest way to share calendar availability
          </p>
          <Link href="/login">
            <Button 
              size="lg" 
              className="text-lg px-16 py-7 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 border-0 shadow-xl hover:shadow-2xl transition-all"
            >
              Sign in with Google
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200/50 dark:border-gray-800/50 py-6 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-600">
            © 2024 Paragon Labs
          </p>
        </div>
      </footer>
    </div>
  );
}
