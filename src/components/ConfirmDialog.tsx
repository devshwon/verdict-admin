import { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520 }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
        {description && (
          <div style={{ color: 'var(--text-mute)', marginBottom: 12 }}>{description}</div>
        )}
        {children}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 20,
          }}
        >
          <button onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
