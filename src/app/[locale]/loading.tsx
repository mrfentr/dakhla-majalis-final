export default function LocaleLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FEFDFB]">
      {/* Centered loading spinner with brand styling */}
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative">
          {/* Outer ring - subtle */}
          <div className="w-14 h-14 rounded-full border-[3px] border-[#EDDBCE]" />
          {/* Spinning arc - brand color */}
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-transparent border-t-[#BF7E4A] animate-spin" />
        </div>

        {/* Brand name */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            className="text-lg font-semibold text-[#BF7E4A] tracking-wide"
            style={{ fontFamily: "'Noto Kufi Arabic', 'Noto Naskh Arabic', Arial, sans-serif" }}
          >
            الداخلة مجالس
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[#BF7E4A] animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 rounded-full bg-[#BF7E4A] animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-1 h-1 rounded-full bg-[#BF7E4A] animate-pulse" style={{ animationDelay: '600ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
