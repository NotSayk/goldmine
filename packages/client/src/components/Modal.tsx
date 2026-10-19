import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from '../assets/Icons';

/** Fenêtre modale accessible (élément <dialog> natif : focus piégé, Échap). */
export function Modal({
  open,
  title,
  onClose,
  children,
  closeLabel = 'Fermer',
}: {
  open: boolean;
  title: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Échap ferme seulement les fenêtres qui peuvent l'être.
        event.preventDefault();
        onClose?.();
      }}
    >
      <div className="dialog__header">
        <h2 id={titleId}>{title}</h2>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            <IconClose />
          </button>
        )}
      </div>
      {open && children}
    </dialog>
  );
}
