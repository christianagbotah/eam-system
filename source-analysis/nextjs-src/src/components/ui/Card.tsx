import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export default function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`bg-white rounded-lg shadow ${paddings[padding]} ${hover ? 'hover:shadow-lg transition-shadow' : ''} ${className}`}>
      {children}
    </div>
  );
}
