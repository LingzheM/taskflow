import { forwardRef } from 'react';
import clsx from 'clsx';

// ── Button ────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:   'bg-[--color-accent] text-white hover:bg-[--color-accent-hover] focus-visible:ring-[--color-accent] active:scale-[0.98]',
      secondary: 'bg-[--color-surface] text-[--color-text-primary] border border-[--color-border] hover:bg-[--color-surface-raised] focus-visible:ring-[--color-accent]',
      ghost:     'text-[--color-text-secondary] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary] focus-visible:ring-[--color-accent]',
      danger:    'bg-[--color-danger] text-white hover:brightness-90 focus-visible:ring-[--color-danger] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-9',
      lg: 'px-5 py-2.5 text-base h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

// ── Input ─────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[--color-text-primary]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border px-3 py-2 text-sm bg-[--color-surface] text-[--color-text-primary]',
            'placeholder:text-[--color-text-muted]',
            'focus:outline-none focus:ring-2 focus:ring-[--color-accent] focus:border-transparent',
            'transition-shadow duration-150',
            error
              ? 'border-[--color-danger] focus:ring-[--color-danger]'
              : 'border-[--color-border] hover:border-[--color-border-strong]',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[--color-danger]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[--color-text-muted]">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ── Textarea ──────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[--color-text-primary]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border px-3 py-2 text-sm bg-[--color-surface] text-[--color-text-primary]',
            'placeholder:text-[--color-text-muted] resize-none',
            'focus:outline-none focus:ring-2 focus:ring-[--color-accent] focus:border-transparent',
            'transition-shadow duration-150',
            error
              ? 'border-[--color-danger]'
              : 'border-[--color-border] hover:border-[--color-border-strong]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[--color-danger]">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// ── Spinner ───────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' };

  return (
    <svg
      className={clsx('animate-spin text-current', sizes[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Modal ─────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full rounded-xl bg-[--color-surface] p-6 animate-fade-in',
          'shadow-[--shadow-modal]',
          maxWidth,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--color-text-primary]">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[--color-text-muted] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}