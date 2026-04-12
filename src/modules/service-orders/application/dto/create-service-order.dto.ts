import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentCategory, Priority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

enum GeoLocationSourceInput {
  GPS = 'GPS',
  MAP = 'MAP',
  MANUAL = 'MANUAL'
}

class ServiceOrderGeoLocationDto {
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

  @ApiPropertyOptional({ enum: ['GPS', 'MAP', 'MANUAL'], default: 'MANUAL' })
  @IsOptional()
  @IsEnum(GeoLocationSourceInput)
  source?: GeoLocationSourceInput;
}

class ServiceOrderAttachmentInputDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  originalFileName!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 1240000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty()
  @IsString()
  storagePath!: string;

  @ApiPropertyOptional({ enum: AttachmentCategory })
  @IsOptional()
  @IsEnum(AttachmentCategory)
  category?: AttachmentCategory;
}

export class CreateServiceOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceTypeId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  slaId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationAddressId?: string;

  @ApiPropertyOptional({ example: 'Falha no equipamento principal' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentServiceOrderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  linkedAssetId?: string;

  @ApiPropertyOptional({
    description: 'Campos dinâmicos definidos no catálogo para o tipo de serviço',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  dynamicFields?: Record<string, unknown>;

  @ApiPropertyOptional({ type: ServiceOrderGeoLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceOrderGeoLocationDto)
  geolocation?: ServiceOrderGeoLocationDto;

  @ApiPropertyOptional({ type: [ServiceOrderAttachmentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceOrderAttachmentInputDto)
  attachments?: ServiceOrderAttachmentInputDto[];
}
