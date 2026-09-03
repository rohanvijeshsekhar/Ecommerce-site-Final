import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs select-none">
      <div className="relative flex flex-col items-center justify-center p-8">
        <div className="w-[180px] h-[50px] flex items-center justify-center">
          <img src="/images/faazo-logo.png" alt="FAAZO Logo" className="max-h-full max-w-full object-contain" />
        </div>
        <span className="text-[10px] font-black tracking-[0.25em] text-[#006670] uppercase mt-4 block">
          Engineering Clinical Excellence
        </span>
      </div>
      <div className="w-48 h-[2px] bg-slate-100 rounded-full mt-2 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-[#006670] rounded-full animate-progress-load w-1/2" />
      </div>
    </div>
  );
}
