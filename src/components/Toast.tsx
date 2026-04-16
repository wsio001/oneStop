import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

type ToastProps = {
  message: string;
  type?: 'success' | 'info';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] flex justify-center pointer-events-none">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm pointer-events-auto">
        {type === 'success' && <CheckCircle size={18} className="text-green-400" />}
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
