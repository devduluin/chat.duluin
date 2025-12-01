import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface DatePickerWithRangeProps {
  date?: DateRange;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({
  date,
  setDate,
  className,
}: DatePickerWithRangeProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const formatted =
  date?.from && date?.to
    ? date.from.getTime() === date.to.getTime()
      ? format(date.from, "Y-m-d") // Single date
      : `${format(date.from, "Y-m-d")} - ${format(date.to, "Y-m-d")}` // Range
    : "Pick date";

  return (
    <div className="w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button
              id="date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-8 text-sm overflow-hidden text-ellipsis whitespace-nowrap",
                !date && "text-muted-foreground"
              )}
            >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatted}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 w-[90vw] sm:w-auto bg-white dark:bg-gray-800"
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

