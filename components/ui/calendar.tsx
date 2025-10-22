import * as React from "react";
import { addDays, format, startOfDay, isSameDay, isWithinInterval, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
  selectedRange?: { start: Date; end: Date };
  onRangeSelect?: (range: { start: Date; end: Date }) => void;
}

export function Calendar({ selectedRange, onRangeSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [rangeStart, setRangeStart] = React.useState<Date | null>(
    selectedRange?.start || null
  );
  const [rangeEnd, setRangeEnd] = React.useState<Date | null>(
    selectedRange?.end || null
  );

  const handleDateClick = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start new selection
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      // Complete the range
      if (isBefore(date, rangeStart)) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
        onRangeSelect?.({ start: date, end: rangeStart });
      } else {
        setRangeEnd(date);
        onRangeSelect?.({ start: rangeStart, end: date });
      }
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isInRange = (date: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (date: Date) => {
    return rangeStart && isSameDay(date, rangeStart);
  };

  const isRangeEnd = (date: Date) => {
    return rangeEnd && isSameDay(date, rangeEnd);
  };

  const isPast = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm dark:text-gray-200"
        >
          ←
        </button>
        <h3 className="text-sm font-semibold dark:text-gray-100">
          {format(currentMonth, "MMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm dark:text-gray-200"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 py-1"
          >
            {day.slice(0, 1)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const inRange = isInRange(day);
          const isStart = isRangeStart(day);
          const isEnd = isRangeEnd(day);
          const disabled = isPast(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => !disabled && handleDateClick(day)}
              disabled={disabled}
              className={cn(
                "aspect-square p-1 text-xs rounded transition-colors dark:text-gray-200",
                "hover:bg-blue-50 dark:hover:bg-blue-900/40 disabled:opacity-30 disabled:cursor-not-allowed",
                inRange && "bg-blue-100 dark:bg-blue-900/40",
                (isStart || isEnd) && "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800",
                !inRange && !isStart && !isEnd && "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {rangeStart && !rangeEnd && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
          Select end date
        </p>
      )}
    </div>
  );
}

