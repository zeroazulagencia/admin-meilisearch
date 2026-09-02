'use client';

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    pause: 'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pause: 'Pausado',
  };
  const isInactive = !status || status !== 'active';
  const color = colors[status || ''] || 'bg-gray-100 text-gray-500';
  const label = labels[status || ''] || status || 'Desconocido';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color} ${isInactive ? 'opacity-60' : ''} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' ? 'bg-green-500' : status === 'pause' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  );
}