import {
  ButtonHTMLAttributes, Children, InputHTMLAttributes, isValidElement, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes,
  useEffect, useRef, useState
} from 'react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { Link } from '../lib/router';

// ------------------------------------------------------------------ buttons
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'saffron' | 'accent';
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  loading?: boolean;
};

export function Button({ variant = 'secondary', size = 'md', icon, loading, children, className = '', disabled, type, ...rest }: BtnProps) {
  return (
    <button type={type ?? 'button'} className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'secondary', size = 'md', icon, children, className = '' }: {
  to: string; variant?: Variant; size?: 'md' | 'sm'; icon?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <Link to={to} className={`btn btn-${variant} btn-${size} ${className}`}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ form controls
export function Field({ label, hint, error, children, className = '' }: {
  label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...p} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="input textarea" {...p} />;
export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option…',
  className = '',
  ariaLabel
}: {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selected = normalizedOptions.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={`c-select-wrap ${open ? 'is-open' : ''} ${className}`} ref={containerRef}>
      <button
        type="button"
        className="c-select-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
      >
        <span className="c-select-label">
          {selected ? (
            <>
              {selected.icon && <span className="c-select-icon">{selected.icon}</span>}
              <span className="c-select-opt-text">{selected.label}</span>
              {selected.badge !== undefined && <span className="c-select-badge">{selected.badge}</span>}
            </>
          ) : (
            <span className="c-select-placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={15} className={`c-select-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="c-select-menu" role="listbox">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`c-select-option ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.icon && <span className="c-select-icon">{opt.icon}</span>}
                <span className="c-select-opt-text">{opt.label}</span>
                {opt.badge !== undefined && <span className="c-select-badge">{opt.badge}</span>}
                {isSelected && <Check size={14} className="c-select-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  className = '',
  'aria-label': ariaLabel,
  placeholder
}: SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string }) {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const childProps = child.props as { value?: string; children?: ReactNode };
      const val = childProps.value !== undefined ? childProps.value : (typeof childProps.children === 'string' ? childProps.children : '');
      const lbl = typeof childProps.children === 'string' ? childProps.children : String(val);
      options.push({ value: String(val), label: lbl });
    }
  });

  return (
    <CustomSelect
      value={String(value ?? '')}
      onChange={(newVal) => {
        if (onChange) {
          const syntheticEvent = {
            target: { value: newVal },
            currentTarget: { value: newVal }
          } as unknown as React.ChangeEvent<HTMLSelectElement>;
          onChange(syntheticEvent);
        }
      }}
      options={options}
      placeholder={placeholder}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

export function Switch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="switch-row">
      <div>
        <div className="switch-label">{label}</div>
        {description && <div className="field-hint">{description}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <i />
      </button>
    </div>
  );
}

export function Chip({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'cobalt' | 'saffron' | 'basil' | 'chili'; icon?: ReactNode }) {
  return (
    <span className={`chip chip-${tone}`}>
      {icon}
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ dialogs
type DialogProps = { open: boolean; onClose: () => void; variant?: 'modal' | 'drawer' | 'sheet'; label: string; children: ReactNode; className?: string };

/** Built on the native <dialog>: focus trap, Escape key and top-layer stacking come for free. */
export function Dialog({ open, onClose, variant = 'modal', label, children, className = '' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${variant} ${className}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      {open && children}
    </dialog>
  );
}

export function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="dialog-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <IconButton label="Close" onClick={onClose}>
        <X size={18} />
      </IconButton>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onClose }: {
  open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} label={title} className="confirm">
      <div className="dialog-pad">
        <h2>{title}</h2>
        <p className="muted">{message}</p>
        <div className="actions end">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------------ misc
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <Loader2 className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, action, art }: { title: string; text: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="empty">
      {art}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty empty-error" role="alert">
      <h3>Something is not working</h3>
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1D3FD6" />
      <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M32 12 50 22v20L32 52 14 42V22z" />
        <path d="M14 22l18 10 18-10M32 32v20" />
      </g>
      <circle cx="48" cy="14" r="6" fill="#F2A33A" />
    </svg>
  );
}

/** Stand-in artwork for a dish without a photo: a plate seen from above. */
export function PlatePlaceholder() {
  return (
    <div className="plate-ph" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="#fff" stroke="#C6CDDC" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#1D3FD6" strokeOpacity=".35" strokeDasharray="2 5" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="60" r="18" fill="#E6EBFC" />
      </svg>
    </div>
  );
}

/** An <img> that falls back to the plate artwork when the photo is missing or the link is dead. */
export function Photo({ src, alt = '' }: { src?: string | null; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <PlatePlaceholder />;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
