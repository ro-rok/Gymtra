import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ExpenseDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export const ExpenseDatePicker = ({ value, onChange, className, id }: ExpenseDatePickerProps) => {
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-h-10 h-10 px-3",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {value ? format(selected!, "d MMM yyyy") : "Pick payment date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[80]" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) onChange(format(day, "yyyy-MM-dd"));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
