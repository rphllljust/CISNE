import React from 'react';

export function Spinner(): React.JSX.Element {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div
        style={{
          width: 28,
          height: 28,
          border: '3px solid #d1d5db',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
