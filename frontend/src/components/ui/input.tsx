import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps): React.JSX.Element {
  return <input className={className} {...props} />;
}
