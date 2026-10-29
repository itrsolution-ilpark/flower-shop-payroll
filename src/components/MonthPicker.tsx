import React from "react";
import { Calendar } from "lucide-react";

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (val: string) => void;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-[#059669]" />
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs font-semibold bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#059669]"
      />
    </div>
  );
}
