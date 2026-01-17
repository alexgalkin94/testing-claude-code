interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-xl flex items-center justify-center active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-white text-black hover:bg-zinc-200',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400',
  };

  // Apple HIG: 44pt minimum touch target, 17pt text
  const sizes = {
    sm: 'px-4 py-2 text-[15px] min-h-[36px]',        // Compact: 15pt, 36px height
    md: 'px-5 py-3 text-[17px] min-h-[44px]',        // Standard: 17pt, 44px min
    lg: 'px-6 py-3.5 text-[17px] min-h-[50px]',      // Large: 17pt, 50px height
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
