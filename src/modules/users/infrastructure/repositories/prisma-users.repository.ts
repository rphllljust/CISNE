import { Injectable } from '@nestjs/common';
import { Prisma, type UserStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateUserRepositoryInput,
  FindUsersParams,
  UpdateUserRepositoryInput,
  UserWithAccess,
  UsersRepository
} from '../../domain/repositories/users.repository';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        teamMemberships: true
      }
    });

    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        userRoles: { include: { role: true } },
        teamMemberships: true
      }
    });

    return user ? this.mapUser(user) : null;
  }

  async findMany(params: FindUsersParams): Promise<{ items: UserWithAccess[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status as UserStatus } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(params.role
        ? {
            userRoles: {
              some: {
                role: {
                  name: params.role
                }
              }
            }
          }
        : {})
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          userRoles: { include: { role: true } },
          teamMemberships: true
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: this.buildOrderBy(params.sort)
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: users.map((user) => this.mapUser(user)),
      total
    };
  }

  async create(input: CreateUserRepositoryInput): Promise<UserWithAccess> {
    const created = await this.prisma.$transaction(async (tx) => {
      const roleIds = input.roleNames?.length
        ? await tx.role.findMany({
            where: { name: { in: input.roleNames } },
            select: { id: true }
          })
        : [];

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          phone: input.phone,
          avatarUrl: input.avatarUrl,
          jobTitle: input.jobTitle,
          department: input.department,
          status: input.status ?? 'ACTIVE',
          userRoles: {
            createMany: {
              data: roleIds.map((role) => ({ roleId: role.id }))
            }
          },
          teamMemberships: input.teamIds?.length
            ? {
                createMany: {
                  data: input.teamIds.map((teamId) => ({ teamId }))
                }
              }
            : undefined
        },
        include: {
          userRoles: { include: { role: true } },
          teamMemberships: true
        }
      });

      return user;
    });

    return this.mapUser(created);
  }

  async update(id: string, input: UpdateUserRepositoryInput): Promise<UserWithAccess> {
    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.roleNames) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        const roles = await tx.role.findMany({
          where: { name: { in: input.roleNames } },
          select: { id: true }
        });

        if (roles.length > 0) {
          await tx.userRole.createMany({
            data: roles.map((role) => ({
              userId: id,
              roleId: role.id
            }))
          });
        }
      }

      if (input.teamIds) {
        await tx.teamMember.deleteMany({ where: { userId: id } });

        if (input.teamIds.length > 0) {
          await tx.teamMember.createMany({
            data: input.teamIds.map((teamId) => ({
              teamId,
              userId: id
            }))
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          avatarUrl: input.avatarUrl,
          jobTitle: input.jobTitle,
          department: input.department,
          status: input.status,
          passwordHash: input.passwordHash
        },
        include: {
          userRoles: { include: { role: true } },
          teamMemberships: true
        }
      });
    });

    return this.mapUser(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE'
      }
    });
  }

  private buildOrderBy(sort?: string): Prisma.UserOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set(['createdAt', 'updatedAt', 'fullName', 'email']);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.UserOrderByWithRelationInput;
  }

  private mapUser(user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    jobTitle: string | null;
    department: string | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{ role: { name: string } }>;
    teamMemberships: Array<{ teamId: string }>;
  }): UserWithAccess {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      department: user.department,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((item) => item.role.name),
      teamIds: user.teamMemberships.map((item) => item.teamId)
    };
  }
}
