import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentCategory, Priority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

class PortalAttachmentDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  originalFileName!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty()
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

class PortalGeoLocationDto {
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
}

export class CreatePortalTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requesterName!: string;

  @ApiProperty()
  @IsEmail()
  requesterEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTaxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationAddressId?: string;

  @ApiPropertyOptional({ type: PortalGeoLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PortalGeoLocationDto)
  geolocation?: PortalGeoLocationDto;

  @ApiPropertyOptional({ type: [PortalAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalAttachmentDto)
  attachments?: PortalAttachmentDto[];
}

export class PortalTrackTicketQueryDto {
  @ApiProperty({ description: 'E-mail usado na abertura do chamado' })
  @IsEmail()
  email!: string;
}
