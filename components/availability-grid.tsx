"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface AvailabilityGridProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime: string; // HH:MM
  endTime: string;
  timezone: string;
  onSelectionChange?: (slots: Record<string, string[]>) => void;
  initialSelection?: Record<string, string[]>;
  readonly?: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

export function AvailabilityGrid({
  startDate,
  endDate,
  startTime,
  endTime,
  timezone,
  onSelectionChange,
  initialSelection = {},
  readonly = false,
}: AvailabilityGridProps) {
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>(initialSelection);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate date range
  const dates = generateDateRange(startDate, endDate);
  
  // Generate time slots (30-minute intervals)
  const timeSlots = generateTimeSlots(startTime, endTime);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedSlots);
    }
  }, [selectedSlots, onSelectionChange]);

  const isSlotSelected = (date: string, time: string): boolean => {
    return selectedSlots[date]?.includes(time) || false;
  };

  const toggleSlot = (date: string, time: string, forceSelect?: boolean) => {
    setSelectedSlots((prev) => {
      const newSlots = { ...prev };
      const dateSlots = newSlots[date] || [];
      const isCurrentlySelected = dateSlots.includes(time);

      if (forceSelect !== undefined) {
        // Explicit mode from drag
        if (forceSelect && !isCurrentlySelected) {
          newSlots[date] = [...dateSlots, time].sort();
        } else if (!forceSelect && isCurrentlySelected) {
          newSlots[date] = dateSlots.filter((t) => t !== time);
        }
      } else {
        // Toggle mode
        if (isCurrentlySelected) {
          newSlots[date] = dateSlots.filter((t) => t !== time);
        } else {
          newSlots[date] = [...dateSlots, time].sort();
        }
      }

      // Clean up empty arrays
      if (newSlots[date]?.length === 0) {
        delete newSlots[date];
      }

      return newSlots;
    });
  };

  const handleMouseDown = (date: string, time: string) => {
    if (readonly) return;
    
    const isCurrentlySelected = isSlotSelected(date, time);
    setDragMode(isCurrentlySelected ? 'deselect' : 'select');
    setIsDragging(true);
    toggleSlot(date, time);
  };

  const handleMouseEnter = (date: string, time: string) => {
    if (readonly) return;
    
    if (isDragging) {
      toggleSlot(date, time, dragMode === 'select');
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const clearAll = () => {
    setSelectedSlots({});
  };

  const selectAll = () => {
    const allSlots: Record<string, string[]> = {};
    dates.forEach((date) => {
      allSlots[date] = timeSlots.map((slot) => slot.time);
    });
    setSelectedSlots(allSlots);
  };

  const totalSelected = Object.values(selectedSlots).reduce(
    (sum, slots) => sum + slots.length,
    0
  );

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{totalSelected}</span> time slots selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      <Card className="p-4 overflow-x-auto">
        <div
          ref={gridRef}
          className="select-none"
          style={{ minWidth: '600px' }}
        >
          {/* Header row with dates */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${dates.length}, 1fr)` }}>
            <div className="font-semibold text-sm p-2">Time</div>
            {dates.map((date) => (
              <div
                key={date}
                className="font-semibold text-sm p-2 text-center border-b-2 border-gray-200 dark:border-gray-700"
              >
                <div>{formatDateHeader(date)}</div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="mt-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.time}
                className="grid gap-1"
                style={{ gridTemplateColumns: `80px repeat(${dates.length}, 1fr)` }}
              >
                <div className="text-xs p-2 text-gray-600 dark:text-gray-400 flex items-center">
                  {formatTime(slot.time)}
                </div>
                {dates.map((date) => {
                  const selected = isSlotSelected(date, slot.time);
                  return (
                    <div
                      key={`${date}-${slot.time}`}
                      onMouseDown={() => handleMouseDown(date, slot.time)}
                      onMouseEnter={() => handleMouseEnter(date, slot.time)}
                      onMouseUp={handleMouseUp}
                      className={`
                        h-8 border border-gray-200 dark:border-gray-700 cursor-pointer
                        transition-colors
                        ${selected 
                          ? 'bg-blue-500 hover:bg-blue-600 border-blue-600' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                        ${readonly ? 'cursor-default' : 'cursor-pointer'}
                      `}
                      title={`${formatDateFull(date)} at ${formatTime(slot.time)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {!readonly && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Click and drag to select multiple time slots at once
        </div>
      )}
    </div>
  );
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function generateTimeSlots(start: string, end: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  let hour = startHour;
  let minute = startMinute;

  while (hour < endHour || (hour === endHour && minute < endMinute)) {
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    slots.push({ time, hour, minute });

    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }

  return slots;
}

function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatDateHeader(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateFull(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

