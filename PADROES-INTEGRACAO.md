# 🏗️ Padrões e Boas Práticas de Integração - Sistema OMS

## 📚 Índice

1. [Padrão de Serviço](#padrão-de-serviço)
2. [Padrão de Repositório](#padrão-de-repositório)
3. [Padrão de Validação](#padrão-de-validação)
4. [Padrão de Notificação](#padrão-de-notificação)
5. [Padrão de Auditoria](#padrão-de-auditoria)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Transações](#transações)
8. [Segurança](#segurança)

---

## 🔧 Padrão de Serviço

### Estrutura FSD por Módulo

```
modules/
├── service-orders/
│   ├── application/
│   │   ├── services/
│   │   │   └── service-orders.service.ts       # Lógica de negócio
│   │   └── use-cases/
│   │       └── transition-service-order-status.use-case.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── service-order.entity.ts         # Entidade do domínio
│   │   └── services/
│   │       └── service-order-status-policy.service.ts
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── prisma-service-orders.repository.ts
│   │   └── models/
│   │       └── service-order.model.ts          # Schema Prisma
│   └── presentation/
│       ├── controllers/
│       │   └── service-orders.controller.ts    # Rotas HTTP
│       └── dtos/
│           ├── create-service-order.dto.ts
│           └── update-service-order.dto.ts
```

### Exemplo: Service com Validação

```typescript
// service-orders.service.ts

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceOrdersRepository } from '../repositories/service-orders.repository';
import { ClientsRepository } from '../../clients/repositories/clients.repository';
import { ServiceOrderStatusPolicy } from '../../domain/services/service-order-status-policy.service';

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly serviceOrdersRepository: ServiceOrdersRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly statusPolicy: ServiceOrderStatusPolicy,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  // ✅ Método com validação completa
  async create(dto: CreateServiceOrderDto, actor: JwtPayload) {
    // 1. Validar cliente
    const client = await this.validateClient(dto.clientId);

    // 2. Validar dependências
    const validations = await Promise.all([
      this.validateServiceType(dto.serviceTypeId),
      this.validateTeam(dto.assignedTeamId),
      this.validateTechnician(dto.assignedTechnicianId, dto.assignedTeamId),
      this.validateAddress(dto.locationAddressId, dto.clientId),
      this.validateContract(dto.contractId, dto.clientId),
      this.validateAsset(dto.linkedAssetId),
    ]);

    // 3. Herança de dados
    const { contractId, slaId, addressId } = this.inheritFromAsset(
      dto.linkedAssetId,
      validations,
    );

    // 4. Criar SO dentro de transação
    const serviceOrder = await this.serviceOrdersRepository.create({
      clientId: dto.clientId,
      serviceTypeId: dto.serviceTypeId,
      title: dto.title,
      description: dto.description,
      contractId: contractId || dto.contractId,
      slaId: slaId || dto.slaId,
      locationAddressId: addressId || dto.locationAddressId,
      assignedTeamId: dto.assignedTeamId,
      assignedTechnicianId: dto.assignedTechnicianId,
      linkedAssetId: dto.linkedAssetId,
      createdById: actor.sub,
      status: 'OPEN',
    });

    // 5. Registrar auditoria
    await this.auditService.log({
      entityType: 'SERVICE_ORDER',
      entityId: serviceOrder.id,
      action: 'CREATE',
      userId: actor.sub,
      changes: serviceOrder,
    });

    // 6. Disparar notificações
    await this.notificationsService.send({
      event: 'ServiceOrderCreated',
      data: { serviceOrderId: serviceOrder.id, clientId: dto.clientId },
    });

    return serviceOrder;
  }

  // ✅ Método de validação reutilizável
  private async validateClient(clientId: string) {
    const client = await this.clientsRepository.findOne({
      where: { id: clientId },
    });

    if (!client || !client.active || client.deletedAt) {
      throw new NotFoundException('Cliente não encontrado ou inativo');
    }

    return client;
  }

  // ✅ Transição de status com policy
  async transitionStatus(
    serviceOrderId: string,
    newStatus: string,
    actor: JwtPayload,
  ) {
    const serviceOrder = await this.serviceOrdersRepository.findOne({
      where: { id: serviceOrderId },
    });

    // Validar transição
    if (!this.statusPolicy.isValidTransition(serviceOrder.status, newStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${serviceOrder.status} → ${newStatus}`,
      );
    }

    // Atualizar status
    const updated = await this.serviceOrdersRepository.update({
      where: { id: serviceOrderId },
      data: { status: newStatus },
    });

    // Auditoria
    await this.auditService.log({
      entityType: 'SERVICE_ORDER',
      entityId: serviceOrderId,
      action: 'STATUS_UPDATE',
      userId: actor.sub,
      changes: { oldStatus: serviceOrder.status, newStatus },
    });

    // Notificar
    await this.notificationsService.send({
      event: 'ServiceOrderStatusChanged',
      data: { serviceOrderId, status: newStatus },
    });

    return updated;
  }
}
```

---

## 📦 Padrão de Repositório

### Interface de Repositório

```typescript
// service-orders.repository.interface.ts

export interface IServiceOrdersRepository {
  create(data: CreateServiceOrderInput): Promise<ServiceOrder>;
  findOne(filter: FindOneFilter): Promise<ServiceOrder | null>;
  findMany(filter: FindManyFilter): Promise<ServiceOrder[]>;
  update(filter: UpdateFilter): Promise<ServiceOrder>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  count(filter: CountFilter): Promise<number>;
}

// Implementação Prisma
@Injectable()
export class PrismaServiceOrdersRepository implements IServiceOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServiceOrderInput): Promise<ServiceOrder> {
    return this.prisma.serviceOrder.create({ data });
  }

  async findOne(filter: FindOneFilter): Promise<ServiceOrder | null> {
    return this.prisma.serviceOrder.findUnique({
      where: filter.where,
      include: filter.include,
    });
  }

  async update(filter: UpdateFilter): Promise<ServiceOrder> {
    return this.prisma.serviceOrder.update({
      where: filter.where,
      data: filter.data,
    });
  }

  // Soft delete
  async softDelete(id: string): Promise<void> {
    await this.prisma.serviceOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

---

## ✅ Padrão de Validação

### Validadores Reutilizáveis

```typescript
// validators/service-order.validators.ts

@Injectable()
export class ServiceOrderValidators {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
  ) {}

  // Validar client
  async validateClient(clientId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.active) {
      throw new BadRequestException('Client is inactive');
    }

    if (client.deletedAt) {
      throw new BadRequestException('Client has been deleted');
    }

    return client;
  }

  // Validar compatibilidade technician-team (CRÍTICO)
  async validateTechnicianInTeam(
    technicianId: string,
    teamId: string,
  ): Promise<TeamMember> {
    const teamMember = await this.teamMembersRepository.findOne({
      where: {
        userId: technicianId,
        teamId: teamId,
      },
    });

    if (!teamMember) {
      throw new BadRequestException(
        'Technician is not a member of the specified team',
      );
    }

    if (!teamMember.active || teamMember.deletedAt) {
      throw new BadRequestException('TeamMember is not active');
    }

    return teamMember;
  }

  // Validar valor para invoice
  validateInvoiceAmount(
    grossAmount: number,
    discountAmount: number,
    taxAmount: number,
  ): { valid: boolean; error?: string } {
    if (grossAmount <= 0) {
      return { valid: false, error: 'Gross amount must be > 0' };
    }

    if (discountAmount < 0 || discountAmount > grossAmount) {
      return { valid: false, error: 'Discount must be between 0 and gross amount' };
    }

    if (taxAmount < 0) {
      return { valid: false, error: 'Tax must be >= 0' };
    }

    const netAmount = grossAmount - discountAmount + taxAmount;
    if (netAmount <= 0) {
      return { valid: false, error: 'Net amount must be > 0' };
    }

    return { valid: true };
  }
}
```

### Usando Validators

```typescript
async createServiceOrder(dto: CreateServiceOrderDto, actor: JwtPayload) {
  // Usar validators
  const client = await this.validators.validateClient(dto.clientId);

  if (dto.assignedTechnicianId && dto.assignedTeamId) {
    await this.validators.validateTechnicianInTeam(
      dto.assignedTechnicianId,
      dto.assignedTeamId,
    );
  }

  // ... resto da lógica
}
```

---

## 🔔 Padrão de Notificação

### Service de Notificações

```typescript
// notifications/notifications.service.ts

@Injectable()
export class NotificationsService {
  constructor(
    private readonly logger: Logger,
    private readonly mailer: MailerService,
    private readonly websocket: WebSocketService,
  ) {}

  // Disparar notificação com suporte a múltiplos canais
  async send(notification: Notification) {
    const { event, data, channels = ['email', 'push', 'websocket'] } = notification;

    this.logger.log(
      `📢 Notificação: ${event}`,
      JSON.stringify(data),
    );

    try {
      if (channels.includes('email')) {
        await this.sendEmail(event, data);
      }

      if (channels.includes('push')) {
        await this.sendPushNotification(event, data);
      }

      if (channels.includes('websocket')) {
        await this.broadcastWebSocket(event, data);
      }
    } catch (error) {
      this.logger.error(
        `❌ Erro ao enviar notificação: ${event}`,
        error.message,
      );
      // Não falhar a operação se notificação falhar
    }
  }

  private async sendEmail(event: string, data: any) {
    // Implementação específica
  }

  private async sendPushNotification(event: string, data: any) {
    // Implementação específica
  }

  private async broadcastWebSocket(event: string, data: any) {
    // Implementação específica
  }
}
```

### Eventos Principais

| Evento | Quando | Destinatários |
|--------|--------|---------------|
| `ServiceOrderCreated` | SO criada | Cliente, Time |
| `ServiceOrderStatusChanged` | Status muda | Cliente, Time, Admin |
| `InvoiceCreated` | Invoice emitida | Cliente, Admin |
| `InvoiceIssued` | Invoice enviada | Cliente |
| `TechnicianAssigned` | Técnico atribuído | Técnico, Cliente |
| `ServiceOrderCompleted` | SO finalizada | Cliente, Admin |

---

## 📋 Padrão de Auditoria

### Audit Service

```typescript
// audit/audit.service.ts

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly logger: Logger,
  ) {}

  async log(auditEntry: AuditEntry) {
    const {
      entityType,
      entityId,
      action,
      userId,
      changes,
      ipAddress,
    } = auditEntry;

    const entry = await this.auditRepository.create({
      entityType,
      entityId,
      action,
      userId,
      changes: JSON.stringify(changes),
      ipAddress,
      timestamp: new Date(),
    });

    this.logger.log(
      `📝 Auditoria: ${action} ${entityType} ${entityId} por ${userId}`,
    );

    return entry;
  }

  // Buscar histórico
  async getHistory(entityType: string, entityId: string) {
    return this.auditRepository.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });
  }

  // Rastrear mudanças
  trackChanges<T>(oldData: T, newData: T): Record<string, any> {
    const changes: Record<string, any> = {};

    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    });

    return changes;
  }
}
```

### Usando Audit

```typescript
// service-orders.service.ts

async transitionStatus(serviceOrderId: string, newStatus: string, actor: JwtPayload) {
  const oldSO = await this.serviceOrdersRepository.findOne({ id: serviceOrderId });
  
  const updated = await this.serviceOrdersRepository.update({
    where: { id: serviceOrderId },
    data: { status: newStatus },
  });

  // Rastrear mudanças
  const changes = this.auditService.trackChanges(oldSO, updated);

  // Registrar auditoria
  await this.auditService.log({
    entityType: 'SERVICE_ORDER',
    entityId: serviceOrderId,
    action: 'STATUS_UPDATE',
    userId: actor.sub,
    changes,
    ipAddress: actor.ip,
  });
}
```

---

## ⚠️ Tratamento de Erros

### Custom Exceptions

```typescript
// exceptions/service-order.exceptions.ts

export class ServiceOrderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Service Order ${id} not found`);
  }
}

export class InvalidStatusTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} → ${to}`);
  }
}

export class TechnicianNotInTeamException extends BadRequestException {
  constructor(technicianId: string, teamId: string) {
    super(
      `Technician ${technicianId} is not a member of team ${teamId}`,
    );
  }
}

export class InvoiceAlreadyExistsException extends BadRequestException {
  constructor(serviceOrderId: string) {
    super(`Invoice already exists for Service Order ${serviceOrderId}`);
  }
}
```

### Error Handler

```typescript
// filters/all-exceptions.filter.ts

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## 🔄 Transações

### Usar Transações para Operações Multi-Tabela

```typescript
// service-orders.service.ts

async createWithDependencies(
  dto: CreateServiceOrderDto,
  actor: JwtPayload,
) {
  // Usar transação do Prisma
  return this.prisma.$transaction(async (tx) => {
    // 1. Criar SO
    const serviceOrder = await tx.serviceOrder.create({
      data: {
        clientId: dto.clientId,
        serviceTypeId: dto.serviceTypeId,
        // ...
      },
    });

    // 2. Atualizar relacionamentos
    await tx.client.update({
      where: { id: dto.clientId },
      data: {
        serviceOrders: {
          connect: { id: serviceOrder.id },
        },
      },
    });

    // 3. Registrar auditoria (na mesma transação)
    await tx.audit.create({
      data: {
        entityType: 'SERVICE_ORDER',
        entityId: serviceOrder.id,
        action: 'CREATE',
        userId: actor.sub,
        changes: JSON.stringify(serviceOrder),
      },
    });

    return serviceOrder;
  });
}
```

---

## 🔒 Segurança

### Validação de Entrada

```typescript
// dtos/create-service-order.dto.ts

export class CreateServiceOrderDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  serviceTypeId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;

  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  // ... outros campos
}
```

### Rate Limiting

```typescript
// guards/rate-limit.guard.ts

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.sub;
    const key = `rate-limit:${userId}`;

    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 60); // 60 segundos
    }

    if (count > 100) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }

    return true;
  }
}
```

### RBAC (Role-Based Access Control)

```typescript
// guards/rbac.guard.ts

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Exemplo: apenas admin pode deletar SO
    if (request.method === 'DELETE' && user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete service orders');
    }

    return true;
  }
}
```

---

## 📝 Resumo de Boas Práticas

✅ **Sempre fazer:**
- Validar todas as entradas (client-side + server-side)
- Usar transações para operações multi-tabela
- Registrar auditoria para todas as alterações críticas
- Tratar erros especificamente (não genéricos)
- Usar soft delete (`deletedAt`) para dados sensíveis
- Validar FK antes de persistir
- Notificar interessados de mudanças importantes
- Implementar rate limiting em endpoints públicos

❌ **Nunca fazer:**
- Confiar em validação apenas client-side
- Misturar lógica de negócio com infraestrutura
- Deletar dados sem audit trail
- Ignorar erros de validação
- Criar SO sem validar dependências
- Emitir Invoice sem verificar status COMPLETED
- Atribuir Technician sem validar Team
- Fazer queries N+1 sem otimização

---

**Versão:** 1.0  
**Data:** 2026-04-21  
**Status:** ✅ Documentado
