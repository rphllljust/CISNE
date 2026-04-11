import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { hash } from 'bcrypt';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import type {
  UsersRepository,
  UserWithAccess
} from '../../domain/repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserUseCase } from '../use-cases/create-user.use-case';

@Injectable()
export class UsersService {
  constructor(
    @Inject(REPOSITORY_TOKENS.USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateUserDto, actor: JwtUserPayload): Promise<UserWithAccess> {
    const user = (await this.createUserUseCase.execute(dto)) as UserWithAccess;

    await this.auditService.register({
      actorId: actor.sub,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: user.id,
      after: {
        email: user.email,
        status: user.status,
        roles: user.roles
      }
    });

    return user;
  }

  async findAll(query: ListUsersQueryDto): Promise<{
    items: UserWithAccess[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.usersRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sort: query.sort,
      status: query.status,
      role: query.role
    });

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async findById(id: string): Promise<UserWithAccess> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: JwtUserPayload): Promise<UserWithAccess> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    if (dto.email && dto.email !== existing.email) {
      const userByEmail = await this.usersRepository.findByEmail(dto.email);
      if (userByEmail) {
        throw new ConflictException('E-mail ja cadastrado');
      }
    }

    const updated = await this.usersRepository.update(id, {
      fullName: dto.fullName,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      jobTitle: dto.jobTitle,
      department: dto.department,
      status: dto.status,
      roleNames: dto.roleNames,
      teamIds: dto.teamIds,
      ...(dto.password ? { passwordHash: await hash(dto.password, 10) } : {})
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'USER_UPDATED',
      resource: 'user',
      resourceId: updated.id,
      before: {
        email: existing.email,
        status: existing.status,
        roles: existing.roles
      },
      after: {
        email: updated.email,
        status: updated.status,
        roles: updated.roles
      }
    });

    return updated;
  }

  async remove(id: string, actor: JwtUserPayload): Promise<void> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    await this.usersRepository.softDelete(id);

    await this.auditService.register({
      actorId: actor.sub,
      action: 'USER_SOFT_DELETED',
      resource: 'user',
      resourceId: id
    });
  }
}
