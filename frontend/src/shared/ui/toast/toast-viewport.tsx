import { CheckCircle, Info, X, XCircle } from 'lucide-react';

import { useToastStore } from './toast.store';

import './toast.css';

const toastIcon = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />
};

const toastIconColor = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--primary)'
};

export function ToastViewport(): React.JSX.Element | null {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-live="polite" aria-label="System notifications">
      {items.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`} role="alert">
          <span style={{ color: toastIconColor[toast.type], flexShrink: 0, display: 'flex' }}>{toastIcon[toast.type]}</span>
          <span style={{ flex: 1, fontSize: '0.845rem', lineHeight: 1.4 }}>{toast.message}</span>
          <button className="toast-close" onClick={() => remove(toast.id)} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

