"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface TimePickerModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: string; // "HH:mm"
  initialTime?: string;  // "HH:mm"
  onClose: () => void;
  onSelect?: (time: string) => void;
  onConfirm?: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export default function TimePickerModal({
  isOpen,
  title,
  initialValue,
  initialTime,
  onClose,
  onSelect,
  onConfirm,
}: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const effectiveInitial = initialTime || initialValue || "09:00";

  useEffect(() => {
    if (effectiveInitial && effectiveInitial.includes(":")) {
      const [h, m] = effectiveInitial.split(":");
      setSelectedHour(h.padStart(2, "0"));
      // 5분 단위 근사값
      const minNum = parseInt(m, 10) || 0;
      const roundedMin = Math.round(minNum / 5) * 5;
      const validMin = Math.min(55, Math.max(0, roundedMin)).toString().padStart(2, "0");
      setSelectedMinute(validMin);
    }
  }, [effectiveInitial, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const formatted = `${selectedHour}:${selectedMinute}`;
    if (onSelect) onSelect(formatted);
    if (onConfirm) onConfirm(formatted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-borderLine space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-base font-bold text-textColor">{title}</h3>
          <div className="text-lg font-bold text-[#059669]">
            {selectedHour}:{selectedMinute}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 시 (00~23) */}
          <div>
            <span className="block text-xs font-semibold text-subText mb-1.5 text-center">
              시 (Hour)
            </span>
            <div className="h-44 overflow-y-auto border border-borderLine rounded-lg p-1 space-y-1 bg-slate-50">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedHour(h)}
                  className={`w-full py-1.5 rounded text-xs font-semibold transition ${
                    selectedHour === h
                      ? "bg-[#059669] text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {h}시
                </button>
              ))}
            </div>
          </div>

          {/* 분 (00~55, 5분 단위 스텝) */}
          <div>
            <span className="block text-xs font-semibold text-subText mb-1.5 text-center">
              분 (Minute / 5분 단위)
            </span>
            <div className="h-44 overflow-y-auto border border-borderLine rounded-lg p-1 space-y-1 bg-slate-50">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMinute(m)}
                  className={`w-full py-1.5 rounded text-xs font-semibold transition ${
                    selectedMinute === m
                      ? "bg-[#059669] text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {m}분
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm}>
            시간 선택 완료
          </Button>
        </div>
      </div>
    </div>
  );
}
