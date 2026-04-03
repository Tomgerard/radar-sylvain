import { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary:   "bg-primary hover:bg-primary-hover text-white shadow-sm",
  secondary: "bg-surface border border-border text-text hover:bg-background shadow-sm",
  ghost:     "text-muted hover:text-text hover:bg-gray-100",
} as const;

const SIZES = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-full font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
