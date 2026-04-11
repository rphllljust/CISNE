import { cn } from '@/shared/lib/cn';

import './input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps): React.JSX.Element {
  const inputId = id ?? props.name;

  return (
    <div className="field">
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <input id={inputId} className={cn(className)} {...props} />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}


