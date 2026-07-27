import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// LoadingOverlay — Full-page loading with FAAZO branding
// ─────────────────────────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message,
  transparent = false,
}) => (
  <div
    className={`fixed inset-0 z-[250] flex flex-col items-center justify-center
      ${transparent ? 'bg-white/70 backdrop-blur-sm' : 'bg-white'}`}
  >
    {/* Spinner */}
    <div className="relative w-16 h-16 mb-5">
      <svg
        className="w-16 h-16 animate-spin"
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle
          cx="32" cy="32" r="28"
          stroke="#E6F2F2"
          strokeWidth="5"
        />
        <path
          d="M32 4a28 28 0 0 1 28 28"
          stroke="#005B63"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      {/* FAAZO F mark center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[#005B63] font-extrabold text-xl tracking-tighter">F</span>
      </div>
    </div>

    {message && (
      <p className="text-sm font-semibold text-slate-500">{message}</p>
    )}
  </div>
);

export default LoadingOverlay;
