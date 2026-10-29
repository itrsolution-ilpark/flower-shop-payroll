"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";

interface TimePickerProps {
  label?: string;
  value: string; // "HH:mm"
  onChange: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export default function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedH, setSelectedH] = useState(value ? value.slice(0, 2) : "09");
  const [selectedM, setSelectedM] = useState(value ? value.slice(3, 5) : "00");

  const handleOpen = () => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setSelectedH(h.padStart(2, "0"));
      const minNum = parseInt(m, 10) || 0;
      const rounded = Math.round(minNum / 5) * 5;
      setSelectedM(Math.min(55, Math.max(0, rounded)).toString().padStart(2, "0"));
    }
    setIsOpen(true);
  };

  const handleConfirm = () => {
    onChange(`${selectedH}:${selectedM}`);
    setIsOpen(false);
  };

  return (
    <div>
      {label && (
        <span className="block text-xs font-semibold text-[#0F172A] mb-1">{label}</span>
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="min-h-[42px] h-[42px] px-3.5 border border-[#E2E8F0] rounded-xl text-xs font-semibold bg-white text-[#0F172A] hover:bg-slate-50 transition flex items-center justify-center min-w-[90px]"
      >
        {value || "09:00"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-bold text-[#0F172A]">시간 선택</span>
              <span className="text-base font-bold text-[#059669]">
                {selectedH}:{selectedM}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-semibold text-[#64748B] mb-1.5 text-center">시 (Hour)</span>
                <div className="h-44 overflow-y-auto border border-[#E2E8F0] rounded-lg p-1 space-y-1 bg-slate-50">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSelectedH(h)}
                      className={`w-full py-1.5 rounded text-xs font-semibold transition ${
                        selectedH === h ? "bg-[#059669] text-white" : "text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {h}시
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#64748B] mb-1.5 text-center">분 (5분 단위)</span>
                <div className="h-44 overflow-y-auto border border-[#E2E8F0] rounded-lg p-1 space-y-1 bg-slate-50">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedM(m)}
                      className={`w-full py-1.5 rounded text-xs font-semibold transition ${
                        selectedM === m ? "bg-[#059669] text-white" : "text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {m}분
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                취소
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirm}>
                선택 완료
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
