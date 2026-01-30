import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

function CustomAlertDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  const dialogRef = useRef(null);

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

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="backdrop:bg-black/50 bg-slate-800 border border-slate-700 rounded-xl p-0 shadow-2xl max-w-md"
    >
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default CustomAlertDialog;
