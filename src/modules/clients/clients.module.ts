import { Module } from '@nestjs/common';

import { REPOSITORY_TOKENS } from '../../common/constants/injection-tokens';

import { ClientsService } from './application/services/clients.service';
import { PrismaClientsRepository } from './infrastructure/repositories/prisma-clients.repository';
import { ClientsController } from './presentation/controllers/clients.controller';

@Module({
  controllers: [ClientsController],
  providers: [
    ClientsService,
    {
      provide: REPOSITORY_TOKENS.CLIENTS_REPOSITORY,
      useClass: PrismaClientsRepository
    }
  ],
  exports: [ClientsService]
})
export class ClientsModule {}
