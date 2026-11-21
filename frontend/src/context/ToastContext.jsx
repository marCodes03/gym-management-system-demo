import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import SvgIcon from '../components/common/SvgIcon';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    container: 'bg-pure-white border-emerald-200 text-obsidian-black',
    accent: 'bg-emerald-600',
    iconWrap: 'bg-emerald-50 text-emerald-700',
    icon: 'check',
  },
  error: {
    container: 'bg-pure-white border-rose-200 text-obsidian-black',
    accent: 'bg-rose-600',
    iconWrap: 'bg-rose-50 text-rose-700',
    icon: 'alert-triangle',
  },
  warning: {
    container: 'bg-pure-white border-amber-200 text-obsidian-black',
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-50 text-amber-700',
    icon: 'alert-triangle',
  },
  info: {
    container: 'bg-pure-white border-royal-blue/25 text-obsidian-black',
    accent: 'bg-royal-blue',
    iconWrap: 'bg-royal-blue-light text-royal-blue-dark',
    icon: 'info',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4200) => {
      if (!message) return null;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const resolvedType = TOAST_STYLES[type] ? type : 'info';

      setToasts((prev) => [...prev.slice(-4), { id, message, type: resolvedType }]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (message, duration) => showToast(message, 'success', duration),
      error: (message, duration) => showToast(message, 'error', duration ?? 5200),
      warning: (message, duration) => showToast(message, 'warning', duration ?? 4800),
      info: (message, duration) => showToast(message, 'info', duration),
    }),
    [showToast]
  );

  const contextValue = useMemo(
    () => ({
      showToast,
      dismissToast,
      toast,
    }),
    [showToast, dismissToast, toast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Top-right floating notification stack */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="no-print fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const style = TOAST_STYLES[item.type] || TOAST_STYLES.info;
          return (
            <div
              key={item.id}
              role={item.type === 'error' ? 'alert' : 'status'}
              className={`animate-toast-in pointer-events-auto relative overflow-hidden rounded-xl border shadow-floating flex items-start gap-3 pl-4 pr-3 py-3 ${style.container}`}
            >
              <span
                className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`}
                aria-hidden="true"
              />
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconWrap}`}
              >
                <SvgIcon name={style.icon} size={15} />
              </span>
              <p className="flex-1 text-sm font-medium leading-snug text-obsidian-black pt-0.5">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-md p-1 text-silver-gray hover:text-obsidian-black hover:bg-silver-canvas transition-colors"
              >
                <SvgIcon name="x" size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return ctx;
}

export default ToastContext;
