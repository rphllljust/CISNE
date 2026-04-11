import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from './button';

describe('Button', () => {
  it('renders label and handles click', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Salvar</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});


