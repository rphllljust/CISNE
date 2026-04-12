import { Module } from '@nestjs/common';

import { KnowledgeBaseService } from './application/services/knowledge-base.service';
import { KnowledgeBaseController } from './presentation/controllers/knowledge-base.controller';

@Module({
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService]
})
export class KnowledgeBaseModule {}
