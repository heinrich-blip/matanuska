"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Truck } from "lucide-react";

export interface VehicleSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface VehicleSelectProps {
  options: VehicleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function VehicleSelect({
  options,
  value,
  onChange,
  placeholder = "Select a vehicle",
  disabled = false,
  className,
}: VehicleSelectProps) {
  const _selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Truck className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <select
        title="Select vehicle"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-12 pl-10 pr-10 rounded-lg appearance-none bg-muted/50 border-0 ring-1 ring-border/50",
          "text-sm font-medium transition-shadow",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{option.sublabel ? ` • ${option.sublabel}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        strokeWidth={1.5}
      />
    </div>
  );
}