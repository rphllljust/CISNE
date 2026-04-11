import { Activity } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { useResetPasswordForm } from '@/features/auth/model';
import { env } from '@/shared/config/env';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Button, Input } from '@/shared/ui';

import '../auth.css';

export function ResetPasswordPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const defaultToken = searchParams.get('token') ?? '';

  const {
    form: {
      register,
      handleSubmit,
      formState: { errors }
    },
    mutation
  } = useResetPasswordForm(defaultToken);

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
          New password,
          <br />
          <span>secure access.</span>
        </h1>

        <p className="auth-brand-description">
          Define a strong password for your account to restore secure access to the platform.
        </p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Reset password</h1>
            <p className="auth-subtitle">Enter the reset token and your new password.</p>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              void handleSubmit((values) => mutation.mutate(values))(event);
            }}
          >
            <Input label="Reset token" error={errors.token?.message} {...register('token')} />

            <Input type="password" label="New password" placeholder="NewPassword@123" error={errors.newPassword?.message} {...register('newPassword')} />

            {mutation.isSuccess ? <p className="auth-feedback auth-feedback-success">Password reset completed successfully.</p> : null}

            {mutation.error ? <p className="auth-feedback auth-feedback-error">{getApiErrorMessage(mutation.error)}</p> : null}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save new password'}
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
