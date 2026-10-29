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
    "w-full h-12 min-h-[48px] rounded-lg font-medium transition flex items-center justify-center text-base focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  let variantStyles = "";

  switch (variant) {
    case "primary":
      variantStyles =
        "bg-primary text-white hover:bg-[#172554] focus:ring-primary";
      break;
    case "secondary":
      variantStyles =
        "bg-emerald text-white hover:bg-[#065F46] focus:ring-emerald";
      break;
    case "danger":
      variantStyles =
        "bg-errorColor text-white hover:bg-[#DC2626] focus:ring-errorColor";
      break;
    case "outline":
      variantStyles =
        "bg-white text-primary border border-primary hover:bg-slate-50 focus:ring-primary";
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
