import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useForgotPasswordForm } from '@/features/auth/model';
import { env } from '@/shared/config/env';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Button, Input } from '@/shared/ui';

import '../auth.css';

export function ForgotPasswordPage(): React.JSX.Element {
  const {
    form: {
      register,
      handleSubmit,
      formState: { errors }
    },
    mutation
  } = useForgotPasswordForm();

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
          Recover
          <br />
          <span>your access.</span>
        </h1>

        <p className="auth-brand-description">
          Provide your corporate email. We will send secure instructions to reset your password.
        </p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Recover password</h1>
            <p className="auth-subtitle">Enter your login email to receive reset instructions.</p>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              void handleSubmit((values) => mutation.mutate(values))(event);
            }}
          >
            <Input label="Email" type="email" placeholder="your.email@company.com" error={errors.email?.message} {...register('email')} />

            {mutation.isSuccess ? <p className="auth-feedback auth-feedback-success">{mutation.data.message}</p> : null}

            {mutation.error ? <p className="auth-feedback auth-feedback-error">{getApiErrorMessage(mutation.error)}</p> : null}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending...' : 'Send instructions'}
            </Button>

            <div className="auth-links">
              <Link to={appRoutes.login}>Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
