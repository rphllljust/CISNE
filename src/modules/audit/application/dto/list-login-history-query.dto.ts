import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListLoginHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'usuario@empresa.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
