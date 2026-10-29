import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "w-full min-h-[46px] h-[46px] rounded-xl font-medium transition-all duration-200 active:scale-95 flex items-center justify-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  let variantStyles = "";

  switch (variant) {
    case "primary":
      variantStyles =
        "bg-[#059669] text-white hover:bg-[#047857] focus:ring-[#059669]";
      break;
    case "secondary":
      variantStyles =
        "bg-[#1E293B] text-white hover:bg-[#0f172a] focus:ring-[#1E293B]";
      break;
    case "danger":
      variantStyles =
        "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500";
      break;
    case "outline":
      variantStyles =
        "bg-white text-slate-800 border border-borderLine hover:bg-slate-50 focus:ring-[#059669]";
      break;
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
