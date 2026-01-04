interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        glass-card p-4
        ${glow ? 'glow-border' : ''}
        ${onClick ? 'cursor-pointer hover:bg-[#1a1a24] active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
