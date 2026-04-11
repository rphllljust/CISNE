# Deploy Profissional (OMS)

Este runbook cobre deploy de producao em VPS (Oracle Cloud Free, AWS EC2, Hetzner, etc.) usando Docker Compose.

## 1. Pre-requisitos do servidor

- Ubuntu 22.04+ (recomendado)
- DNS apontando para o IP publico (ex.: `oms.seudominio.com`)
- Portas liberadas: `22`, `80`, `443`
- Docker Engine + Docker Compose plugin instalados

## 2. Preparacao inicial

1. Clone o projeto no servidor:

```bash
git clone <repo-url> /opt/oms
cd /opt/oms
```

2. Crie o arquivo de ambiente de producao:

```bash
cp .env.production.example .env.production
```

3. Edite `.env.production` com segredos reais:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_DOMAIN`
- `CADDY_EMAIL`

4. Garanta permissao de execucao dos scripts:

```bash
chmod +x scripts/deploy/*.sh
```

## 3. Primeiro deploy

```bash
./scripts/deploy/deploy.sh
```

Ao final, valide:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://oms.seudominio.com/health
```

## 4. Atualizacao segura

```bash
git pull --ff-only
./scripts/deploy/deploy.sh
```

O script aplica migrations antes de subir a aplicacao.

## 5. Backup e restore

Backup:

```bash
./scripts/deploy/backup-postgres.sh
```

Restore:

```bash
./scripts/deploy/restore-postgres.sh backups/oms_oms_20260408_120000.sql.gz
```

## 6. Observabilidade operacional

- Logs de containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f edge
```

- Logs HTTP do proxy: volume `caddy_logs`
- Health checks ativos para `postgres`, `api` e `frontend`

## 7. Rollback rapido

1. Volte para um commit/tag estavel:

```bash
git checkout <tag-ou-commit-estavel>
```

2. Reaplique deploy:

```bash
./scripts/deploy/deploy.sh
```

3. Se necessario, restaure banco com backup.

## 8. CI/CD (GitHub Actions)

Workflows incluidos:

- `.github/workflows/ci.yml` (lint, testes, build backend e frontend)
- `.github/workflows/deploy-production.yml` (deploy remoto por SSH)

Secrets esperados:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH` (ex.: `/opt/oms`)

Importante: mantenha `.env.production` apenas no servidor, fora do repositorio.
