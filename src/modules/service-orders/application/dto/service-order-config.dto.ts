import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, ServiceOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export class CreateServiceOrderTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceTypeId!: string;

  @ApiProperty()
  @IsString()
  titleTemplate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  defaultPriority?: Priority;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  defaultDynamicData?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListServiceOrderTemplateQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateServiceOrderClassificationRuleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiPropertyOptional({ description: 'Perfil solicitante (ex.: CLIENT, ATTENDANT)' })
  @IsOptional()
  @IsString()
  requesterRole?: string;

  @ApiProperty({
    description: 'Palavras-chave separadas por vírgula. Ex.: queda energia,disjuntor'
  })
  @IsString()
  keywordPattern!: string;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ListServiceOrderClassificationRuleQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateWorkflowTransitionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiProperty({ enum: ServiceOrderStatus })
  @IsEnum(ServiceOrderStatus)
  fromStatus!: ServiceOrderStatus;

  @ApiProperty({ enum: ServiceOrderStatus })
  @IsEnum(ServiceOrderStatus)
  toStatus!: ServiceOrderStatus;

  @ApiProperty()
  @IsString()
  actionLabel!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  startSlaTimer?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 480 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(480)
  triageAlertMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListWorkflowTransitionQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: ServiceOrderStatus })
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  fromStatus?: ServiceOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertDynamicFieldSchemaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceTypeId!: string;

  @ApiProperty()
  @IsString()
  fieldKey!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({
    description: 'text | number | date | select | checkbox | upload | geolocation'
  })
  @IsString()
  fieldType!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  options?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListDynamicFieldSchemaQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceTypeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
