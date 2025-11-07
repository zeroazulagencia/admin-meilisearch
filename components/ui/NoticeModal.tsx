'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export default function NoticeModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  showCancel = false
}: NoticeModalProps) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      buttonColor: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      buttonColor: 'bg-[#5DE1E5] hover:bg-[#4BC5C9] text-black',
    },
  };

  const styles = typeStyles[type];
  const Icon = styles.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className={`px-6 py-4 ${styles.bgColor} border-l-4 ${styles.borderColor}`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${styles.iconColor} mr-3`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 break-words overflow-wrap-anywhere">
                {title && (
                  <h3 className={`text-lg font-medium ${styles.titleColor} mb-2`}>
                    {title}
                  </h3>
                )}
                <p className="text-gray-700 whitespace-pre-line break-words overflow-wrap-anywhere">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${styles.buttonColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

