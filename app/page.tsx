"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Calendar, Users, Shield, Moon, Sun } from "lucide-react";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-slate-900 transition-colors">
      {/* Header */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-1 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo-full.png" 
              alt="Booker Pro" 
              width={450} 
              height={180}
              className="h-24 w-auto"
              priority
            />
          </Link>
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Link href="/login">
              <Button>Sign in with Google</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Find Meeting Times Across Organizations
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Coordinate schedules effortlessly with granular calendar permissions.
          Perfect for cross-company collaboration.
        </p>
        <Link href="/login">
          <Button size="lg" className="text-lg px-8 py-6">
            Get Started with Google
          </Button>
        </Link>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg dark:border dark:border-gray-700">
            <Calendar className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">Smart Scheduling</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Automatically find times when all participants are available using
              real-time Google Calendar data.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg dark:border dark:border-gray-700">
            <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">Permission Control</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Grant one-time, user-specific, or domain-wide calendar access with
              full control over your privacy.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg dark:border dark:border-gray-700">
            <Users className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">Cross-Organization</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Schedule meetings with anyone, anywhere. Perfect for client
              meetings, partnerships, and external collaboration.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-gray-800 py-16 transition-colors">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 dark:text-gray-100">How It Works</h3>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2 dark:text-gray-100">Sign in with Google</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Connect your Google Calendar securely. Your calendar data stays
                  private and encrypted.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2 dark:text-gray-100">
                  Request calendar access
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Ask participants for permission to view their availability.
                  They choose the level of access to grant.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2 dark:text-gray-100">Find perfect times</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  See when everyone is free and schedule your meeting instantly.
                  No more email chains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 transition-colors">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-gray-500">
            © 2024 Booker. Simplifying cross-organization scheduling.
          </p>
        </div>
      </footer>
    </div>
  );
}
