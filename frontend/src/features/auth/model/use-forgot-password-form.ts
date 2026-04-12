import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { authApi } from '@/features/auth/api/auth.api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail valido.')
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function useForgotPasswordForm() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const mutation = useMutation({
    mutationFn: (payload: ForgotPasswordValues) => authApi.forgotPassword(payload)
  });

  return {
    form,
    mutation
  };
}

