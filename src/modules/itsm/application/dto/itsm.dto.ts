import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeCategory, ChangeRiskLevel, ChangeStatus, Priority, ProblemStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class CreateProblemRecordDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workaround?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedServiceOrderId?: string;
}

export class UpdateProblemRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProblemStatus })
  @IsOptional()
  @IsEnum(ProblemStatus)
  status?: ProblemStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workaround?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class ListProblemRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProblemStatus })
  @IsOptional()
  @IsEnum(ProblemStatus)
  status?: ProblemStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class CreateChangeRequestDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ enum: ChangeCategory, default: ChangeCategory.NORMAL })
  @IsOptional()
  @IsEnum(ChangeCategory)
  category?: ChangeCategory;

  @ApiPropertyOptional({ enum: ChangeRiskLevel, default: ChangeRiskLevel.MEDIUM })
  @IsOptional()
  @IsEnum(ChangeRiskLevel)
  riskLevel?: ChangeRiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impactAnalysis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  implementationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollbackPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  problemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedServiceOrderId?: string;
}

export class UpdateChangeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ChangeCategory })
  @IsOptional()
  @IsEnum(ChangeCategory)
  category?: ChangeCategory;

  @ApiPropertyOptional({ enum: ChangeStatus })
  @IsOptional()
  @IsEnum(ChangeStatus)
  status?: ChangeStatus;

  @ApiPropertyOptional({ enum: ChangeRiskLevel })
  @IsOptional()
  @IsEnum(ChangeRiskLevel)
  riskLevel?: ChangeRiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impactAnalysis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  implementationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollbackPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  problemId?: string;
}

export class ListChangeRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ChangeStatus })
  @IsOptional()
  @IsEnum(ChangeStatus)
  status?: ChangeStatus;

  @ApiPropertyOptional({ enum: ChangeCategory })
  @IsOptional()
  @IsEnum(ChangeCategory)
  category?: ChangeCategory;

  @ApiPropertyOptional({ enum: ChangeRiskLevel })
  @IsOptional()
  @IsEnum(ChangeRiskLevel)
  riskLevel?: ChangeRiskLevel;
}

export class ItsmMetricsQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  onlyOpen?: boolean;
}
