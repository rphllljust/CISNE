import { Building2, Mail, Phone, ShieldCheck, User2, Users } from 'lucide-react';

import { useAuthStore } from '@/features/auth/model';
import { useUserById } from '@/features/users/api/users.api';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Alert, Breadcrumbs, Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '@/shared/ui';

import '../pages.css';

export function ProfilePage(): React.JSX.Element {
  const currentUser = useAuthStore((state) => state.user);
  const userQuery = useUserById(currentUser?.sub ?? '');

  const breadcrumbs = [
    { label: 'Dashboard', to: appRoutes.dashboard },
    { label: 'Profile' }
  ];

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Account"
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        title="User Profile"
        subtitle="Personal details, role assignment and security context."
      />

      {userQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={160} />
          <Skeleton height={200} />
        </div>
      ) : userQuery.isError ? (
        <Alert
          variant="danger"
          title="Profile unavailable"
          message={getApiErrorMessage(userQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void userQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : userQuery.data ? (
        <>
          <Card>
            <div className="profile-header">
              <div className="profile-avatar" aria-hidden="true">
                <User2 size={24} />
              </div>
              <div className="profile-header-main">
                <h2 className="profile-name">{userQuery.data.fullName}</h2>
                <p className="profile-email">{userQuery.data.email}</p>
              </div>
              <StatusBadge
                label={userQuery.data.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                tone={userQuery.data.status === 'ACTIVE' ? 'green' : 'gray'}
              />
            </div>
          </Card>

          <div className="profile-grid">
            <Card title="Contact and Organization">
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="detail-field-label">Email</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Mail size={14} />
                    {userQuery.data.email}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Phone</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Phone size={14} />
                    {userQuery.data.phone || 'Not informed'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Role</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <ShieldCheck size={14} />
                    {userQuery.data.roles.join(', ')}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Department</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Building2 size={14} />
                    {userQuery.data.department || 'Not assigned'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Job title</span>
                  <span className="detail-field-value">{userQuery.data.jobTitle || 'Not assigned'}</span>
                </div>
              </div>
            </Card>

            <Card title="Teams and Access">
              <div className="page-grid">
                {userQuery.data.teamIds.length === 0 ? (
                  <EmptyState
                    title="No team linked"
                    description="The user is active but has no linked operation team yet."
                    icon={<Users size={18} />}
                  />
                ) : (
                  <div className="chips-wrap">
                    {userQuery.data.teamIds.map((teamId) => (
                      <code key={teamId} className="chip-code">
                        {teamId}
                      </code>
                    ))}
                  </div>
                )}

                <Alert
                  variant="info"
                  message="Permission and role changes are managed in Users and Teams."
                />
              </div>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState title="No profile data" description="Unable to load current user details." />
      )}
    </section>
  );
}

