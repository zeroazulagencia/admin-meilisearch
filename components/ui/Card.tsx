import { cn } from '@/utils/cn';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-md dark:bg-gray-800', className)}>
      {children}
    </div>
  );
}


