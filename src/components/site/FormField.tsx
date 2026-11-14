import type { ReactNode } from "react";

/** Label + control + hint + error, wired together for screen readers. */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? (
          <span className="text-signal" aria-hidden>
            {" "}
            *
          </span>
        ) : optionalLabel ? (
          <span className="ms-2 text-[0.78rem] font-normal text-ash">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
