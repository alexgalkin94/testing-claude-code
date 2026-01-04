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
        <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
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
          className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
