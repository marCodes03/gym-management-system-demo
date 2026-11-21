import { useCallback, useEffect, useState } from 'react';
import SvgIcon from '../common/SvgIcon';
import DirtyGuardModal from '../modals/DirtyGuardModal';

/**
 * Mad Max Gym — Standardized Right Slide-In CRUD Drawer
 * - max-w-[540px] w-full, px-7 py-5 header/body spacing
 * - Descriptive subtitle prop
 * - Dual footer / actions prop support
 * - Symmetric enter/exit slide animations
 * - Automatic Unsaved Changes Guard (`isDirty`) via DirtyGuardModal
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  isDirty = false,
  footer,
  actions,
  children,
  maxWidth = 'max-w-[540px]',
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [showDirtyGuard, setShowDirtyGuard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setShowDirtyGuard(false);
    setIsVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 220);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDirtyGuard(true);
      return;
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDirtyGuard(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (showDirtyGuard) {
          setShowDirtyGuard(false);
        } else {
          requestClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDirtyGuard, requestClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const rawFooter = footer || actions;
  const footerContent =
    typeof rawFooter === 'function' ? rawFooter({ requestClose }) : rawFooter;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'mm-drawer-title' : undefined}
      >
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={requestClose}
          className={`fixed inset-0 bg-obsidian-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Slide-in Panel */}
        <aside
          className={`relative z-10 flex h-full w-full ${maxWidth} flex-col bg-pure-white border-l border-silver-border shadow-modal transition-transform duration-200 ease-out ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-silver-border bg-pure-white px-7 py-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="mm-drawer-title"
                  className="text-xl font-semibold tracking-tight text-obsidian-black truncate"
                >
                  {title}
                </h2>
                {isDirty ? (
                  <span
                    title="Unsaved changes"
                    className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0"
                  />
                ) : null}
              </div>
              {subtitle ? (
                <p className="mt-1 text-sm text-steel-gray leading-snug">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={requestClose}
              aria-label="Close drawer"
              className="shrink-0 rounded-lg p-2 text-steel-gray hover:text-obsidian-black hover:bg-silver-canvas transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue"
            >
              <SvgIcon name="x" size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-7 py-5">{children}</div>

          {/* Footer */}
          {footerContent ? (
            <div className="shrink-0 border-t border-silver-border bg-silver-canvas/70 px-7 py-4 flex items-center justify-end gap-2.5">
              {footerContent}
            </div>
          ) : null}
        </aside>
      </div>

      {/* Unsaved Changes Guard */}
      <DirtyGuardModal
        isOpen={showDirtyGuard}
        onKeepEditing={() => setShowDirtyGuard(false)}
        onDiscard={handleConfirmDiscard}
      />
    </>
  );
}
