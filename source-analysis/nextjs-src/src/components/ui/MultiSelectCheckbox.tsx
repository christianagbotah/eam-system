'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Option {
  id: number | string;
  label: string;
  sublabel?: string;
}

interface MultiSelectCheckboxProps {
  label: string;
  options: Option[];
  value: (number | string)[];
  onChange: (selected: (number | string)[]) => void;
  required?: boolean;
  placeholder?: string;
}

export default function MultiSelectCheckbox({
  label,
  options,
  value = [],
  onChange,
  required = false,
  placeholder = 'Select items...'
}: MultiSelectCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: number | string) => {
    const newValue = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(newValue);
  };

  const selectedLabels = options
    .filter(opt => value.includes(opt.id))
    .map(opt => opt.label)
    .join(', ');

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-lg cursor-pointer bg-white hover:border-blue-400 transition-colors"
      >
        <div className="flex justify-between items-center">
          <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {selectedLabels && (
          <div className="text-xs text-gray-600 mt-1 truncate">{selectedLabels}</div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option.id}
                onClick={() => toggleOption(option.id)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${value.includes(option.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {value.includes(option.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  {option.sublabel && <div className="text-xs text-gray-500">{option.sublabel}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
