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
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm text-zinc-400 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
