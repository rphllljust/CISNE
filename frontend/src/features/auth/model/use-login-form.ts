import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuthStore } from '@/features/auth/model/auth.store';

const loginSchema = z.object({
  email: z.string().trim().min(3, 'Informe sua credencial corporativa.'),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.')
});

export type LoginValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const signIn = useAuthStore((state) => state.signIn);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const mutation = useMutation({
    mutationFn: signIn
  });

  return {
    form,
    mutation
  };
}
