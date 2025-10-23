"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  summary?: string;
}

interface WeeklyCalendarProps {
  onSlotSelect?: (slots: Date[]) => void;
  selectedSlots?: Date[];
  showWeekends?: boolean;
  startHour?: number;
  endHour?: number;
  userTimezone?: string;
  calendarStartToday?: boolean;
}

export function WeeklyCalendar({ 
  onSlotSelect, 
  selectedSlots = [], 
  showWeekends = false,
  startHour = 8,
  endHour = 18,
  userTimezone = 'America/New_York',
  calendarStartToday = false
}: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [busySlots, setBusySlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<Date[]>(selectedSlots);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartSlot, setDragStartSlot] = useState<Date | null>(null);
  const [allowBusySlots, setAllowBusySlots] = useState(false);
  const dragModeRef = useRef<'add' | 'remove'>('add');

  // Determine week start based on settings
  let weekStart: Date;
  if (calendarStartToday) {
    // Start from today
    weekStart = new Date(currentWeek);
    weekStart.setHours(0, 0, 0, 0);
  } else {
    // If weekends enabled, start on Sunday (0), otherwise Monday (1)
    weekStart = startOfWeek(currentWeek, { weekStartsOn: showWeekends ? 0 : 1 });
  }
  
  // If weekends enabled, show 7 days (Sun-Sat), otherwise 5 days (Mon-Fri)
  const numDays = showWeekends ? 7 : 5;
  const days = Array.from({ length: numDays }, (_, i) => addDays(weekStart, i));
  
  // Dynamic hours based on user's availability settings
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  useEffect(() => {
    fetchBusySlots();
  }, [currentWeek]);

  const fetchBusySlots = async () => {
    try {
      const weekEnd = addDays(weekStart, 7);
      const response = await fetch(
        `/api/calendar/busy?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setBusySlots(
          data.busy?.map((slot: any) => ({
            start: new Date(slot.start),
            end: new Date(slot.end),
            available: false,
            summary: slot.summary,
          })) || []
        );
      }
    } catch (error) {
      console.error("Failed to fetch busy slots:", error);
    }
  };

  const isSlotBusy = (day: Date, hour: number, minute: number) => {
    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return busySlots.some(
      (busy) => slotTime < busy.end && slotEnd > busy.start
    );
  };

  const getSlotTitle = (day: Date, hour: number, minute: number): string | undefined => {
    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    const busySlot = busySlots.find(
      (busy) => slotTime < busy.end && slotEnd > busy.start
    );
    
    return busySlot?.summary;
  };

  const isSlotSelected = (day: Date, hour: number, minute: number) => {
    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);
    
    return selected.some(
      (sel) => 
        sel.getTime() === slotTime.getTime()
    );
  };

  const toggleSlot = (day: Date, hour: number, minute: number, isDragMode = false) => {
    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);

    const busy = isSlotBusy(day, hour, minute);
    if (busy && !allowBusySlots && !isDragMode) return;

    const existingIndex = selected.findIndex(
      (sel) => sel.getTime() === slotTime.getTime()
    );

    let newSelected;
    if (isDragMode) {
      // In drag mode, use the dragMode to determine add/remove
      if (dragModeRef.current === 'add' && existingIndex < 0) {
        newSelected = [...selected, slotTime];
      } else if (dragModeRef.current === 'remove' && existingIndex >= 0) {
        newSelected = selected.filter((_, i) => i !== existingIndex);
      } else {
        return; // No change needed
      }
    } else {
      // Normal click toggle
      if (existingIndex >= 0) {
        newSelected = selected.filter((_, i) => i !== existingIndex);
      } else {
        newSelected = [...selected, slotTime];
      }
    }

    setSelected(newSelected);
    onSlotSelect?.(newSelected);
  };

  const handleMouseDown = (day: Date, hour: number, minute: number) => {
    const busy = isSlotBusy(day, hour, minute);
    if (busy && !allowBusySlots) return;
    
    const past = isPast(day, hour, minute);
    if (past) return;

    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);
    
    const isAlreadySelected = isSlotSelected(day, hour, minute);
    dragModeRef.current = isAlreadySelected ? 'remove' : 'add';
    
    setIsDragging(true);
    setDragStartSlot(slotTime);
    toggleSlot(day, hour, minute, false);
  };

  const handleMouseEnter = (day: Date, hour: number, minute: number) => {
    if (!isDragging) return;

    const busy = isSlotBusy(day, hour, minute);
    if (busy && !allowBusySlots) return;
    
    const past = isPast(day, hour, minute);
    if (past) return;

    toggleSlot(day, hour, minute, true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartSlot(null);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const isPast = (day: Date, hour: number, minute: number) => {
    const slotTime = new Date(day);
    slotTime.setHours(hour, minute, 0, 0);
    return slotTime < new Date();
  };

  return (
    <div className="space-y-3">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium dark:text-gray-200">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={allowBusySlots}
              onChange={(e) => setAllowBusySlots(e.target.checked)}
              className="rounded"
            />
            Allow busy slots
          </label>
          {selected.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected([]);
                onSlotSelect?.([]);
              }}
            >
              Clear ({selected.length})
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Header - Days */}
        <div 
          className="grid gap-0 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          style={{ 
            gridTemplateColumns: showWeekends 
              ? '60px repeat(7, 1fr)' 
              : '60px repeat(5, 1fr)' 
          }}
        >
          <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
            {(() => {
              const tzMap: Record<string, string> = {
                'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
                'America/Los_Angeles': 'PT', 'America/Phoenix': 'MST', 'America/Anchorage': 'AKT',
                'Pacific/Honolulu': 'HST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
                'Europe/Berlin': 'CET', 'Asia/Tokyo': 'JST', 'Asia/Shanghai': 'CST', 
                'Asia/Kolkata': 'IST', 'Australia/Sydney': 'AEDT'
              };
              return tzMap[userTimezone] || (userTimezone.includes('/') ? userTimezone.split('/').pop() : userTimezone);
            })()}
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center text-xs font-medium ${
                isSameDay(day, new Date())
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <div>{format(day, "EEE")}</div>
              <div className="text-lg">{format(day, "d")}</div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div>
          {hours.map((hour, hourIndex) => (
            <div 
              key={hour} 
              className="grid gap-0"
              style={{ 
                gridTemplateColumns: showWeekends 
                  ? '60px repeat(7, 1fr)' 
                  : '60px repeat(5, 1fr)' 
              }}
            >
              {/* Time Label */}
              <div className={`p-2 text-xs text-gray-500 dark:text-gray-400 border-r dark:border-gray-700 text-center ${hourIndex < hours.length - 1 ? 'border-b dark:border-gray-700' : ''}`}>
                {format(new Date().setHours(hour, 0), "ha")}
              </div>

              {/* Slots for each day */}
              {days.map((day, dayIndex) => (
                <div key={`${day.toISOString()}-${hour}`} className={`flex flex-col ${dayIndex < days.length - 1 ? 'border-r dark:border-gray-700' : ''} ${hourIndex < hours.length - 1 ? 'border-b dark:border-gray-700' : ''}`}>
                  {[0, 30].map((minute, minuteIndex) => {
                    const busy = isSlotBusy(day, hour, minute);
                    const selected = isSlotSelected(day, hour, minute);
                    const past = isPast(day, hour, minute);
                    const title = getSlotTitle(day, hour, minute);

                    return (
                      <button
                        key={minute}
                        onMouseDown={() => handleMouseDown(day, hour, minute)}
                        onMouseEnter={() => handleMouseEnter(day, hour, minute)}
                        disabled={past || (busy && !allowBusySlots)}
                        title={busy && title ? title : undefined}
                        className={`w-full h-6 transition-colors select-none block ${
                          past
                            ? "bg-gray-100 dark:bg-gray-900 cursor-not-allowed opacity-50"
                            : busy && !allowBusySlots
                            ? "bg-red-100 dark:bg-red-900/20 cursor-not-allowed"
                            : selected
                            ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 cursor-pointer"
                            : busy && allowBusySlots
                            ? "bg-red-50 dark:bg-red-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                            : "bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded"></div>
          <span>Busy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded"></div>
          <span>Available</span>
        </div>
      </div>
    </div>
  );
}

