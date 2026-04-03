interface BentoCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export default function BentoCard({ children, title, className = "" }: BentoCardProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border p-6 shadow-sm ${className}`}>
      {title && (
        <h3 className="text-text font-bold text-sm uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
