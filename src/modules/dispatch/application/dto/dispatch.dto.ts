import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export class UpdateTechnicianLocationDto {
  @ApiProperty({ example: -8.760773 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -63.899899 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracyM?: number;

  @ApiPropertyOptional({ default: 'mobile' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class DispatchRecommendationQueryDto {
  @ApiPropertyOptional({ description: 'Especialidade requerida para priorizar técnicos' })
  @IsOptional()
  @IsString()
  requiredSkill?: string;
}

export class OptimizeRouteDto {
  @ApiProperty({ type: [String], description: 'IDs de ordens de serviço' })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceOrderIds!: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Coordenadas de origem opcionais quando sem técnico' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startLongitude?: number;
}
