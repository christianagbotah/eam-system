'use client';

interface StatusModalProps {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

export default function StatusModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  buttonText
}: StatusModalProps) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className={`w-16 h-16 ${isSuccess ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce`}>
            {isSuccess ? (
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 mb-6">{message}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`w-full px-4 py-2.5 bg-gradient-to-r ${
              isSuccess
                ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                : 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
            } text-white rounded-lg font-semibold shadow-lg transition-all text-sm`}
          >
            {buttonText || (isSuccess ? 'OK' : 'Try Again')}
          </button>
        </div>
      </div>
    </div>
  );
}
