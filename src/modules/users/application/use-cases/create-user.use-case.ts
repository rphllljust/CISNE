import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import type { UsersRepository } from '../../domain/repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository
  ) {}

  async execute(dto: CreateUserDto): Promise<unknown> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('E-mail ja cadastrado');
    }

    const passwordHash = await hash(dto.password, 10);
    return this.usersRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      jobTitle: dto.jobTitle,
      department: dto.department,
      status: dto.status,
      roleNames: dto.roleNames,
      teamIds: dto.teamIds
    });
  }
}
