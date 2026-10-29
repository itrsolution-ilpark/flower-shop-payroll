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
  let baseStyles =
    "w-full h-12 rounded-lg font-medium transition flex items-center justify-center text-base focus:outline-none focus:ring-2 focus:ring-offset-2";

  let variantStyles = "";

  switch (variant) {
    case "primary":
      variantStyles =
        "bg-primary text-white hover:bg-[#235d27] focus:ring-primary";
      break;
    case "secondary":
      variantStyles =
        "bg-secondary text-textColor hover:bg-[#6fb572] focus:ring-secondary";
      break;
    case "danger":
      variantStyles =
        "bg-errorColor text-white hover:bg-[#b71c1c] focus:ring-errorColor";
      break;
    case "outline":
      variantStyles =
        "bg-white text-primary border border-primary hover:bg-background focus:ring-primary";
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
