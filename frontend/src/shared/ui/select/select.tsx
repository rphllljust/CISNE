import './select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, id, ...props }: SelectProps): React.JSX.Element {
  const inputId = id ?? props.name;

  return (
    <div className="select">
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <select id={inputId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="select-error">{error}</p> : null}
    </div>
  );
}


