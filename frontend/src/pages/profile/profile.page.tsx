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
    { label: 'Painel', to: appRoutes.dashboard },
    { label: 'Perfil' }
  ];

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Conta"
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        title="Perfil do Usuario"
        subtitle="Dados pessoais, perfil de acesso e contexto de seguranca."
      />

      {userQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={160} />
          <Skeleton height={200} />
        </div>
      ) : userQuery.isError ? (
        <Alert
          variant="danger"
          title="Perfil indisponivel"
          message={getApiErrorMessage(userQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void userQuery.refetch()}>
              Tentar novamente
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
                label={userQuery.data.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                tone={userQuery.data.status === 'ACTIVE' ? 'green' : 'gray'}
              />
            </div>
          </Card>

          <div className="profile-grid">
            <Card title="Contato e Organizacao">
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="detail-field-label">E-mail</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Mail size={14} />
                    {userQuery.data.email}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Telefone</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Phone size={14} />
                    {userQuery.data.phone || 'Nao informado'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Perfil</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <ShieldCheck size={14} />
                    {userQuery.data.roles.join(', ')}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Departamento</span>
                  <span className="detail-field-value detail-field-value-inline">
                    <Building2 size={14} />
                    {userQuery.data.department || 'Nao atribuido'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Cargo</span>
                  <span className="detail-field-value">{userQuery.data.jobTitle || 'Nao atribuido'}</span>
                </div>
              </div>
            </Card>

            <Card title="Equipes e Acesso">
              <div className="page-grid">
                {userQuery.data.teamIds.length === 0 ? (
                  <EmptyState
                    title="Nenhuma equipe vinculada"
                    description="O usuario esta ativo, mas ainda nao possui equipe operacional vinculada."
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
                  message="Alteracoes de permissoes e perfis sao gerenciadas em Usuarios e Equipes."
                />
              </div>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState title="Sem dados de perfil" description="Nao foi possivel carregar os dados do usuario atual." />
      )}
    </section>
  );
}
