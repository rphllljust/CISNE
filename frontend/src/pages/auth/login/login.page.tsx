import { useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useLoginForm } from '@/features/auth/model';
import { env } from '@/shared/config/env';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Button, Input } from '@/shared/ui';
import { useToastStore } from '@/shared/ui/toast';

import '../auth.css';

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pushToast = useToastStore((state) => state.push);
  const {
    form: {
      register,
      handleSubmit,
      formState: { errors }
    },
    mutation
  } = useLoginForm();

  useEffect(() => {
    if (mutation.isSuccess) {
      pushToast({ type: 'success', message: 'Sessao iniciada com sucesso.' });
      void navigate(params.get('redirectTo') ?? appRoutes.dashboard, { replace: true });
    }
  }, [mutation.isSuccess, navigate, params, pushToast]);

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-logo-icon">
            <Activity size={22} />
          </div>
          <span className="auth-brand-logo-text">{env.appName}</span>
        </div>

        <h1 className="auth-brand-heading">
          Operacoes de servico
          <br />
          <span>em tempo real.</span>
        </h1>

        <p className="auth-brand-description">
          Plataforma centralizada para ordens de servico, acompanhamento de execucao das equipes, governanca de SLA e analise gerencial.
        </p>

        <div className="auth-brand-features">
          {[
            'Controle operacional em todas as ordens de servico',
            'Visibilidade de SLA com alertas proativos',
            'Rastreabilidade completa com eventos de auditoria imutaveis',
            'Acesso por perfil de operacao'
          ].map((feature) => (
            <div key={feature} className="auth-brand-feature">
              <span className="auth-brand-feature-dot" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Entrar</h1>
            <p className="auth-subtitle">Use suas credenciais corporativas para acessar o sistema.</p>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              void handleSubmit((values) => mutation.mutate(values))(event);
            }}
          >
            <Input label="E-mail" type="email" placeholder="seu.email@empresa.com" error={errors.email?.message} {...register('email')} />

            <Input label="Senha" type="password" placeholder="********" error={errors.password?.message} {...register('password')} />

            {mutation.error ? <p className="auth-feedback auth-feedback-error">{getApiErrorMessage(mutation.error)}</p> : null}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="auth-links">
              <Link to={appRoutes.forgotPassword}>Esqueci a senha</Link>
              <span>v1.0.0</span>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
