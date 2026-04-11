import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class TransitionServiceOrderStatusDto {
  @ApiProperty({ enum: ServiceOrderStatus })
  @IsEnum(ServiceOrderStatus)
  toStatus!: ServiceOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
