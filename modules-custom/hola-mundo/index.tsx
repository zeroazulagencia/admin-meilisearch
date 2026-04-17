'use client';

import { useState, useEffect } from 'react';

export default function HolaMundo() {
  const [saludo, setSaludo] = useState('Hola Mundo!');

  useEffect(() => {
    console.log('🧪 MóduloHolaMundo cargado');
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">🧪 Hola Mundo!</h1>
        <p className="text-green-100">Este es un módulo de prueba</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-2xl text-gray-900 font-semibold">{saludo}</p>
        <button
          onClick={() => setSaludo('Hola Mundo! ' + new Date().toLocaleTimeString())}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}