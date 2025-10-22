"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { EmailInput } from "@/components/ui/email-input";
import { ArrowLeft } from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

interface AvailableSlot {
  start: string;
  end: string;
}

export default function FindMeetingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [participantEmails, setParticipantEmails] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfDay(new Date()),
    end: endOfDay(addDays(new Date(), 7)),
  });
  const [duration, setDuration] = useState("60");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        // Set current user's email as default
        setParticipantEmails([data.user.email]);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const handleFindTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setShowResults(false);

    if (participantEmails.length === 0) {
      setError("Please add at least one participant");
      setIsLoading(false);
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
        setError(data.error || "Failed to find meeting times");
        setIsLoading(false);
        return;
      }

      setAvailableSlots(data.availableSlots);
      setParticipants(data.participants);
      setShowResults(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookMeeting = async (slot: AvailableSlot) => {
    const title = prompt("Enter meeting title:");
    if (!title) return;

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: "",
          start_time: slot.start,
          end_time: slot.end,
          participant_ids: participants.map((p) => p.id),
        }),
      });

      if (response.ok) {
        alert("Meeting created successfully!");
        router.push("/dashboard");
      } else {
        alert("Failed to create meeting");
      }
    } catch (err) {
      alert("Failed to create meeting");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <h2 className="text-2xl font-bold mb-4">Find Meeting Times</h2>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Meeting Details</CardTitle>
              <CardDescription className="text-sm">
                Enter participant emails and meeting preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFindTimes} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-2 rounded-md text-xs">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="emails" className="text-sm">Participants</Label>
                  <EmailInput
                    emails={participantEmails}
                    onChange={setParticipantEmails}
                    placeholder="Type email and press Enter..."
                  />
                  <p className="text-xs text-gray-500">
                    You're included by default. Add others and press Enter.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm">Duration</Label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} size="sm">
                  {isLoading ? "Searching..." : "Find Available Times"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Label className="text-sm">Timeframe</Label>
              <CardDescription className="text-xs">
                Select date range (next 7 days selected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                selectedRange={dateRange}
                onRangeSelect={setDateRange}
              />
              {dateRange.start && dateRange.end && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs">
                  <strong>Selected:</strong>{" "}
                  {format(dateRange.start, "MMM d")} -{" "}
                  {format(dateRange.end, "MMM d, yyyy")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {showResults && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available Time Slots</CardTitle>
              <CardDescription className="text-sm">
                Found {availableSlots.length} available slot(s) for all participants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-6 text-sm">
                  No common available times found. Try a different date range.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableSlots.slice(0, 20).map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(slot.start), "PPP")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(slot.start), "p")} -{" "}
                          {format(new Date(slot.end), "p")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBookMeeting(slot)}
                      >
                        Book
                      </Button>
                    </div>
                  ))}
                  {availableSlots.length > 20 && (
                    <p className="text-xs text-gray-500 text-center">
                      Showing first 20 of {availableSlots.length} slots
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

