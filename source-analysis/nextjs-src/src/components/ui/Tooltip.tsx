'use client';

import { ReactNode, useState } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className="absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded shadow-lg -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {content}
        </div>
      )}
    </div>
  );
}
