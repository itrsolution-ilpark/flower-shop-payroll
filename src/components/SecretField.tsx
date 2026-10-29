import React from "react";

interface SecretFieldProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

export default function SecretField({
  label = "비밀",
  value,
  onChange,
  placeholder = "••••",
  id,
  name,
  autoFocus,
}: SecretFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    onChange(numeric);
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#0F172A] mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669] text-[#0F172A]"
      />
    </div>
  );
}
