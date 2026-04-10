'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string | number;
  label: string;
  sublabel?: string;
  image?: string;
}

interface MultiSelectTagsProps {
  options: Option[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function MultiSelectTags({ options, value, onChange, placeholder = 'Select...', label, required }: MultiSelectTagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt?.label?.toLowerCase().includes(search.toLowerCase()) ||
    opt?.sublabel?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (id: string | number) => {
    const normalizedId = id.toString();
    const normalizedValue = value.map(v => v.toString());
    
    if (normalizedValue.includes(normalizedId)) {
      onChange(value.filter(v => v.toString() !== normalizedId));
    } else {
      onChange([...value, id]);
    }
  };

  const removeOption = (id: string | number) => {
    onChange(value.filter(v => v.toString() !== id.toString()));
  };

  const selectedOptions = options.filter(opt => 
    value.map(v => v.toString()).includes(opt.id.toString())
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent cursor-pointer bg-white hover:border-gray-400 transition-colors"
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-sm font-medium border border-purple-200"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(opt.id);
                  }}
                  className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm py-0.5">{placeholder}</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = value.map(v => v.toString()).includes(opt.id.toString());
                return (
                  <div
                    key={opt.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleOption(opt.id);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 pointer-events-none"
                      />
                      {opt.image && (
                        <img src={opt.image} alt={opt.label} className="w-8 h-8 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-gray-700">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-xs text-gray-500">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
