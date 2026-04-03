const VARIANTS = {
  success:  "bg-green-50 text-green-700 border-green-200",
  default:  "bg-gray-50 text-gray-600 border-gray-200",
  warning:  "bg-orange-50 text-orange-700 border-orange-200",
  danger:   "bg-red-50 text-red-700 border-red-200",
  info:     "bg-blue-50 text-blue-700 border-blue-200",
} as const;

interface BadgeProps {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}

export default function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
