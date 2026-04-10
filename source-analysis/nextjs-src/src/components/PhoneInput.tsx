'use client';

import { useState, useRef, useEffect } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

const countries = [
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
];

export default function PhoneInput({ value, onChange, label, required }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const country = countries.find(c => value.startsWith(c.dial));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.dial, ''));
      } else {
        setPhoneNumber(value);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPhoneNumber(cleaned);
    onChange(selectedCountry.dial + cleaned);
  };

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    onChange(country.dial + phoneNumber);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {label && <label className="block text-sm font-medium">{label} {required && '*'}</label>}
        <div ref={wrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2 py-0.5 border rounded bg-white hover:bg-gray-50 flex items-center gap-1 text-xs"
          >
            <span>{selectedCountry.flag}</span>
            <span>{selectedCountry.dial}</span>
            <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isOpen && (
            <div className="absolute z-50 right-0 mt-1 bg-white border rounded-lg shadow-lg w-64 max-h-64 overflow-y-auto">
              {countries.map(country => (
                <div
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center gap-3 ${
                    country.code === selectedCountry.code ? 'bg-blue-100' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{country.name}</div>
                    <div className="text-xs text-gray-500">{country.dial}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder="123456789"
        className="w-full px-3 py-2 border rounded-lg text-sm"
        required={required}
      />
    </div>
  );
}
