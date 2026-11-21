import { forwardRef, useId } from 'react';
import SvgIcon from './SvgIcon';

const Select = forwardRef(function Select(
  {
    id,
    label,
    required = false,
    error,
    helperText,
    options,
    placeholder,
    children,
    className = '',
    selectClassName = '',
    containerClassName = '',
    disabled = false,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gunmetal-gray mb-1.5"
        >
          {label}
          {required ? <span className="text-red-600 ml-0.5">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${selectId}-error`
              : helperText
              ? `${selectId}-helper`
              : undefined
          }
          className={`w-full min-h-[42px] appearance-none rounded-lg border bg-pure-white pl-3.5 pr-9 py-2 text-sm text-obsidian-black transition-colors focus:outline-none focus:ring-2 disabled:bg-silver-canvas disabled:text-steel-gray disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-silver-border focus:border-royal-blue focus:ring-royal-blue/20'
          } ${selectClassName} ${className}`}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}

          {Array.isArray(options)
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-steel-gray flex items-center">
          <SvgIcon name="chevron-down" size={16} />
        </span>
      </div>

      {error ? (
        <p
          id={`${selectId}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="mt-1.5 text-xs text-steel-gray">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
