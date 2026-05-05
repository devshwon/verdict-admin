import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastVariant = 'default' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}>
        {items.map((t, i) => (
          <ToastView key={t.id} item={t} index={i} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ item, index }: { item: ToastItem; index: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`toast ${item.variant}`}
      style={{
        bottom: 24 + index * 50,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {item.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
