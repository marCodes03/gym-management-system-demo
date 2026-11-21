import { useEffect, useRef, useState } from 'react';
import SvgIcon from './SvgIcon';

/**
 * In-column hover-highlighted Kebab Action Menu (`⋮`).
 * Placed inside the rightmost data column to maximize horizontal table density.
 */
export default function KebabMenu({
  items = [],
  align = 'right',
  dropUp = false,
  ariaLabel = 'Row actions',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter((item) => item && !item.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue ${
          open
            ? 'bg-royal-blue-light text-royal-blue-dark'
            : 'text-steel-gray hover:bg-silver-canvas hover:text-obsidian-black'
        }`}
      >
        <SvgIcon name="more-vertical" size={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-30 min-w-[188px] rounded-xl border border-silver-border bg-pure-white py-1.5 shadow-floating ${
            align === 'left' ? 'left-0' : 'right-0'
          } ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {visibleItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${idx}`}
                  className="my-1 border-t border-silver-border/70"
                  role="separator"
                />
              );
            }

            const variantClass =
              item.variant === 'danger'
                ? 'text-rose-700 hover:bg-rose-50'
                : item.variant === 'primary'
                ? 'text-royal-blue-dark hover:bg-royal-blue-light/60 font-medium'
                : 'text-obsidian-black hover:bg-silver-canvas';

            return (
              <button
                key={item.key || item.label || idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (!item.disabled && typeof item.onClick === 'function') {
                    item.onClick();
                  }
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${variantClass}`}
              >
                {item.icon ? (
                  <SvgIcon
                    name={item.icon}
                    size={15}
                    className={
                      item.variant === 'danger'
                        ? 'text-rose-600'
                        : item.variant === 'primary'
                        ? 'text-royal-blue'
                        : 'text-steel-gray'
                    }
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
