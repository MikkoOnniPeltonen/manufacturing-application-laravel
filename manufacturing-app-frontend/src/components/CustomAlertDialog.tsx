import { Button } from '@/components/ui/button';
import { type KeyboardEvent, type MouseEvent, useEffect, useRef } from 'react';

function CustomAlertDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="backdrop:bg-black/50 bg-card border border-border rounded-xl p-0 shadow-2xl max-w-md"
    >
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-border text-foreground hover:bg-secondary"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default CustomAlertDialog;
