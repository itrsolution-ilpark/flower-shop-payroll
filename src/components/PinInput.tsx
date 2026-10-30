"use client";

import React from "react";

interface PinInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  length: 4 | 6;
  placeholder?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

export default function PinInput({
  label = "비밀번호",
  value,
  onChange,
  length,
  placeholder,
  id,
  name,
  autoFocus,
}: PinInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/[^0-9]/g, "").slice(0, length);
    onChange(numeric);
  };

  const dots = "•".repeat(length);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#0F172A] mb-1">
          {label} (숫자 {length}자리)
        </label>
      )}
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern={`[0-9]{${length}}`}
        maxLength={length}
        value={value}
        onChange={handleChange}
        placeholder={placeholder || dots}
        autoFocus={autoFocus}
        className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669] text-[#0F172A]"
      />
    </div>
  );
}
