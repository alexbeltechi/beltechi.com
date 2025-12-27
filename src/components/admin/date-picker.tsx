"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  label?: string;
  placeholder?: string;
  showTime?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  showTime = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDate = value ? new Date(value) : null;

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    if (showTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    return date.toLocaleDateString("en-US", options);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const handleSelectDate = (date: Date) => {
    // Preserve time if showTime and value exists
    if (showTime && selectedDate) {
      date.setHours(selectedDate.getHours(), selectedDate.getMinutes());
    }
    onChange(date.toISOString());
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (type: "hours" | "minutes", val: string) => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    if (type === "hours") {
      date.setHours(parseInt(val) || 0);
    } else {
      date.setMinutes(parseInt(val) || 0);
    }
    onChange(date.toISOString());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-2 text-foreground">
          {label}
        </label>
      )}

      {/* Input trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(!isOpen)}
        className={`w-full h-9 px-3 py-2 bg-background border border-input rounded-md text-sm text-left flex items-center gap-2 transition-colors cursor-pointer ${
          isOpen
            ? "outline-none ring-1 ring-ring"
            : "hover:border-muted-foreground/50"
        }`}
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        {selectedDate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-auto p-0.5 hover:bg-muted rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-md z-20 p-3 w-[280px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1)
                )
              }
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1)
                )
              }
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-xs text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(viewDate).map(({ date, isCurrentMonth }, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectDate(date)}
                className={`
                  w-8 h-8 text-sm rounded-md transition-colors
                  ${!isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                  ${isToday(date) && !isSelected(date) ? "border border-border" : ""}
                  ${isSelected(date) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}
                `}
              >
                {date.getDate()}
              </button>
            ))}
          </div>

          {/* Time picker */}
          {showTime && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time:</span>
              <input
                type="number"
                min="0"
                max="23"
                value={selectedDate?.getHours() ?? 12}
                onChange={(e) => handleTimeChange("hours", e.target.value)}
                className="w-14 px-2 py-1 text-sm border border-input bg-background text-foreground rounded-md text-center"
              />
              <span className="text-foreground">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={selectedDate?.getMinutes() ?? 0}
                onChange={(e) => handleTimeChange("minutes", e.target.value)}
                className="w-14 px-2 py-1 text-sm border border-input bg-background text-foreground rounded-md text-center"
              />
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(new Date().toISOString());
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

