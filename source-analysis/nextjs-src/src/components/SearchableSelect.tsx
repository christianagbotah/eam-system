'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ id?: string | number; value?: string | number; label: string; sublabel?: string }>;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function SearchableSelect({ value, onChange, options, placeholder = 'Select...', label, required, className }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label?.toLowerCase().includes(search.toLowerCase()) ||
    opt.sublabel?.toLowerCase().includes(search.toLowerCase())
  );

  const getOptionId = (opt: any) => opt.id ?? opt.value;
  const selectedOption = options.find(opt => getOptionId(opt) == value);

  return (
    <div ref={wrapperRef} className="relative">
      {label && <label className="block text-sm font-medium mb-1">{label} {required && '*'}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-lg bg-white cursor-pointer flex justify-between items-center hover:border-blue-400"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
            ) : (
              filteredOptions.map(opt => {
                const optId = getOptionId(opt);
                return (
                  <div
                    key={optId}
                    onClick={() => {
                      onChange(String(optId));
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${optId == value ? 'bg-blue-100' : ''}`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    {opt.sublabel && <div className="text-xs text-gray-500">{opt.sublabel}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
