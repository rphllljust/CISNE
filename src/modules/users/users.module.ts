import { Module } from '@nestjs/common';

import { REPOSITORY_TOKENS } from '../../common/constants/injection-tokens';

import { UsersService } from './application/services/users.service';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository';
import { UsersController } from './presentation/controllers/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    CreateUserUseCase,
    {
      provide: REPOSITORY_TOKENS.USERS_REPOSITORY,
      useClass: PrismaUsersRepository
    }
  ],
  exports: [UsersService]
})
export class UsersModule {}
