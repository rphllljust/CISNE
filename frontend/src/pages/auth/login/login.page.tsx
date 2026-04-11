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
      pushToast({ type: 'success', message: 'Session started successfully.' });
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
          Service operations
          <br />
          <span>in real time.</span>
        </h1>

        <p className="auth-brand-description">
          Centralized platform for service orders, team execution tracking, SLA governance and managerial analytics.
        </p>

        <div className="auth-brand-features">
          {[
            'Operational control across every service order',
            'SLA visibility with proactive alerts',
            'Full traceability with immutable audit events',
            'Role-based access by operation profile'
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
            <h1>Sign in</h1>
            <p className="auth-subtitle">Use your corporate credentials to access OMS.</p>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              void handleSubmit((values) => mutation.mutate(values))(event);
            }}
          >
            <Input label="Email" type="email" placeholder="your.email@company.com" error={errors.email?.message} {...register('email')} />

            <Input label="Password" type="password" placeholder="********" error={errors.password?.message} {...register('password')} />

            {mutation.error ? <p className="auth-feedback auth-feedback-error">{getApiErrorMessage(mutation.error)}</p> : null}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="auth-links">
              <Link to={appRoutes.forgotPassword}>Forgot password</Link>
              <span>v1.0.0</span>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

