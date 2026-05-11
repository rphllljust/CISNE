# Credenciais de Acesso - OMS System

## Admin Inicial (seed seguro)

EMAIL: admin@oms.local  
SENHA: definida por variavel de ambiente segura  
ROLE: SUPER_ADMIN

## Tecnico Inicial (seed seguro)

EMAIL: tecnico@oms.local  
SENHA: definida por variavel de ambiente segura  
ROLE: TECHNICIAN

## Regras obrigatorias

1. Defina `SEED_ADMIN_PASSWORD` e `SEED_TECH_PASSWORD` (ou `ADMIN_INITIAL_PASSWORD` no seed-admin) antes de rodar seed.
2. Senhas iniciais devem ter no minimo 12 caracteres com maiuscula, minuscula, numero e simbolo.
3. Senhas padrao conhecidas sao bloqueadas.
4. Usuarios criados via seed entram com `mustChangePassword=true`.

URLs padrao:
- API Base: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/api/v1/health

