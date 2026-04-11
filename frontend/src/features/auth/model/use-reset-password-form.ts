import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { authApi } from '@/features/auth/api/auth.api';

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid token.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include uppercase, lowercase and number.')
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function useResetPasswordForm(defaultToken = '') {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: defaultToken,
      newPassword: ''
    }
  });

  const mutation = useMutation({
    mutationFn: (payload: ResetPasswordValues) => authApi.resetPassword(payload)
  });

  return {
    form,
    mutation
  };
}
