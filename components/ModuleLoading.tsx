'use client';

export default function ModuleLoading({ inline }: { inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <div
            className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full"
            style={{ borderColor: '#5DE1E5' }}
          />
          <p className="mt-2 text-sm text-gray-500">Cargando módulo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div
          className="inline-block animate-spin h-10 w-10 border-4 border-t-transparent rounded-full"
          style={{ borderColor: '#5DE1E5' }}
        />
        <p className="mt-3 text-base text-gray-600">Cargando módulo...</p>
      </div>
    </div>
  );
}
