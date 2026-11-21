import { forwardRef } from 'react';
import SvgIcon from './SvgIcon';

const VARIANT_CLASSES = {
  primary: 'btn-tactile-royal font-semibold',
  secondary:
    'bg-pure-white text-gunmetal-gray border border-silver-border hover:bg-silver-canvas hover:text-obsidian-black hover:border-silver-gray active:translate-y-[1px] shadow-sm font-medium',
  danger: 'btn-tactile-danger font-semibold',
  ghost:
    'bg-transparent text-gunmetal-gray hover:bg-silver-canvas hover:text-obsidian-black font-medium',
  kiosk:
    'btn-tactile-royal min-h-[52px] px-6 py-3.5 text-base font-bold tracking-tight',
};

const SIZE_CLASSES = {
  sm: 'min-h-[34px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[40px] px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'min-h-[46px] px-5 py-2.5 text-sm rounded-xl gap-2',
  kiosk: 'min-h-[52px] px-6 py-3.5 text-base rounded-xl gap-2.5',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const resolvedVariant = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const resolvedSize =
    variant === 'kiosk'
      ? SIZE_CLASSES.kiosk
      : SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center whitespace-nowrap select-none transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue focus-visible:ring-offset-2 disabled:opacity-55 disabled:cursor-not-allowed ${resolvedVariant} ${resolvedSize} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <SvgIcon name="refresh-cw" size={16} className="animate-spin" />
      ) : leftIcon ? (
        typeof leftIcon === 'string' ? (
          <SvgIcon name={leftIcon} size={variant === 'kiosk' ? 20 : 16} />
        ) : (
          leftIcon
        )
      ) : null}

      {children ? <span>{children}</span> : null}

      {!loading && rightIcon ? (
        typeof rightIcon === 'string' ? (
          <SvgIcon name={rightIcon} size={variant === 'kiosk' ? 20 : 16} />
        ) : (
          rightIcon
        )
      ) : null}
    </button>
  );
});

export default Button;
