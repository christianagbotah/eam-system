'use client';

import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block" ref={ref} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-[9999] px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-lg -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
          {text}
          <div className="absolute w-2 h-2 bg-slate-900 rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
}
