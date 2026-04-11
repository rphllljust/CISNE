import { Button } from '@/shared/ui/button';

import './modal.css';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="modal-panel">
        <header className="modal-header">
          <h3>{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}


