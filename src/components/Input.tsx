interface InputProps {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  suffix,
  className = '',
  min,
  max,
  step,
  inputMode,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        // Apple HIG: 13pt for labels/captions
        <label className="block text-[13px] text-zinc-400 mb-2">{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          // Apple HIG: 17pt text, 44pt minimum height
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[17px] min-h-[44px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[15px]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
