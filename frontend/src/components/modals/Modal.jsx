import { useEffect, useState } from 'react';
import SvgIcon from '../common/SvgIcon';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const PRINT_BODY_CLASSES = {
  'receipt-80mm': 'print-receipt-80mm',
  'qr-pass': 'print-qr-pass',
};

/**
 * Mad Max Gym — Centered High-Focus Modal Dialog
 * Features an Obsidian Black header bar with a Royal Blue accent underline,
 * backdrop blur, dual footer/actions support, and @media print isolation.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  actions,
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  printMode = 'none',
  zIndexClass = 'z-50',
  bodyClassName = '',
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 180);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (typeof onClose === 'function') onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const footerContent = footer || actions;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const isPrintable = printMode && printMode !== 'none';
  const printContentClass = PRINT_BODY_CLASSES[printMode] || '';

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 ${
        isPrintable ? 'print-isolated-root' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'mm-modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdrop && typeof onClose === 'function') onClose();
        }}
        className={`no-print fixed inset-0 bg-obsidian-black/65 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal Panel */}
      <div
        className={`relative z-10 w-full ${sizeClass} max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-pure-white border border-silver-border shadow-modal transition-all duration-200 ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        } ${isPrintable ? 'print:max-h-none print:border-0 print:rounded-none print:shadow-none' : ''}`}
      >
        {/* Obsidian Black Header Bar + Royal Blue Accent Line */}
        {title || showCloseButton ? (
          <div className="no-print bg-obsidian-black text-pure-white border-b-2 border-royal-blue px-6 py-4 flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0">
              {title ? (
                <h2
                  id="mm-modal-title"
                  className="text-lg font-semibold tracking-tight text-pure-white truncate"
                >
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="mt-0.5 text-xs text-silver-gray leading-relaxed">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {showCloseButton && typeof onClose === 'function' ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="shrink-0 rounded-lg p-1.5 text-silver-gray hover:text-pure-white hover:bg-carbon-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue"
              >
                <SvgIcon name="x" size={18} />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Body */}
        <div
          className={`flex-1 overflow-y-auto px-6 py-5 ${printContentClass} ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footerContent ? (
          <div className="no-print shrink-0 border-t border-silver-border bg-silver-canvas/60 px-6 py-3.5 flex items-center justify-end gap-2.5">
            {footerContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
