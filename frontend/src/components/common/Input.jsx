import { forwardRef, useId, useState } from 'react';
import SvgIcon from './SvgIcon';

const Input = forwardRef(function Input(
  {
    id,
    label,
    type = 'text',
    required = false,
    error,
    helperText,
    leftIcon,
    rightElement,
    mono = false,
    className = '',
    inputClassName = '',
    containerClassName = '',
    disabled = false,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const hasLeftIcon = Boolean(leftIcon);
  const hasRightControl = isPassword || Boolean(rightElement);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gunmetal-gray mb-1.5"
        >
          {label}
          {required ? <span className="text-red-600 ml-0.5">*</span> : null}
        </label>
      ) : null}

      <div className="relative flex items-center">
        {hasLeftIcon ? (
          <span className="pointer-events-none absolute left-3 text-silver-gray flex items-center">
            {typeof leftIcon === 'string' ? (
              <SvgIcon name={leftIcon} size={17} />
            ) : (
              leftIcon
            )}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
          className={`w-full min-h-[42px] rounded-lg border bg-pure-white text-sm text-obsidian-black placeholder:text-silver-gray transition-colors focus:outline-none focus:ring-2 disabled:bg-silver-canvas disabled:text-steel-gray disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-silver-border focus:border-royal-blue focus:ring-royal-blue/20'
          } ${hasLeftIcon ? 'pl-10' : 'pl-3.5'} ${
            hasRightControl ? 'pr-10' : 'pr-3.5'
          } py-2 ${mono ? 'font-mono tabular-nums' : ''} ${inputClassName} ${className}`}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 p-1.5 rounded-md text-steel-gray hover:text-obsidian-black hover:bg-silver-canvas transition-colors disabled:opacity-50"
          >
            <SvgIcon name={showPassword ? 'eye-off' : 'eye'} size={17} />
          </button>
        ) : rightElement ? (
          <div className="absolute right-2.5 flex items-center">
            {rightElement}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-steel-gray">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
