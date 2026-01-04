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
        bg-zinc-900 border border-zinc-800 rounded-xl p-4
        ${glow ? 'border-zinc-700' : ''}
        ${onClick ? 'cursor-pointer hover:bg-zinc-800/50 active:scale-[0.99] transition-all' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
