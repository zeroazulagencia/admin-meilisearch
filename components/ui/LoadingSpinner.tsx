interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export default function LoadingSpinner({ size = 'md', color = 'blue' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  const colors = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600',
  };
  
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-t-transparent ${sizes[size]} ${colors[color as keyof typeof colors]}`} />
  );
}


