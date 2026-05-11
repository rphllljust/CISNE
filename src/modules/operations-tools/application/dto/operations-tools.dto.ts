import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

export class TriageScoreInputDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 4 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  impact!: number;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  urgency!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 72, example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(72)
  effortHours?: number;
}

export class ChecklistTemplateInputDto {
  @ApiProperty({
    enum: ['INSTALLATION', 'CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'PROJECT']
  })
  @IsString()
  @IsIn(['INSTALLATION', 'CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'PROJECT'])
  serviceCategory!: 'INSTALLATION' | 'CORRECTIVE' | 'PREVENTIVE' | 'INSPECTION' | 'PROJECT';
}

export class SlaPlanInputDto {
  @ApiProperty({ example: '2026-04-22T10:00:00.000Z' })
  @IsDateString()
  openedAt!: string;

  @ApiProperty({ minimum: 1, maximum: 48, example: 4 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(48)
  responseTargetHours!: number;

  @ApiProperty({ minimum: 1, maximum: 720, example: 24 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(720)
  resolutionTargetHours!: number;
}

export class TechnicianLoadInputDto {
  @ApiProperty({ example: 'tech-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Ana Costa' })
  @IsString()
  name!: string;

  @ApiProperty({ type: [String], example: ['network', 'field'] })
  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @ApiProperty({ minimum: 0, example: 12 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentLoadHours!: number;

  @ApiProperty({ minimum: 1, example: 40 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  weeklyCapacityHours!: number;
}

export class WorkOrderBalancingInputDtoItem {
  @ApiProperty({ example: 'os-1001' })
  @IsString()
  id!: string;

  @ApiProperty({ type: [String], example: ['network'] })
  @IsArray()
  @IsString({ each: true })
  requiredSkills!: string[];

  @ApiProperty({ minimum: 1, maximum: 80, example: 6 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(80)
  estimatedHours!: number;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  priority!: number;
}

export class WorkloadBalancingInputDto {
  @ApiProperty({ type: [TechnicianLoadInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TechnicianLoadInputDto)
  technicians!: TechnicianLoadInputDto[];

  @ApiProperty({ type: [WorkOrderBalancingInputDtoItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderBalancingInputDtoItem)
  workOrders!: WorkOrderBalancingInputDtoItem[];
}

export class RouteStopInputDto {
  @ApiProperty({ example: 'os-1001' })
  @IsString()
  id!: string;

  @ApiProperty({ minimum: -90, maximum: 90, example: -8.7612 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -63.9004 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ minimum: 5, maximum: 600, example: 45 })
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(600)
  serviceMinutes!: number;
}

export class RoutePlanInputDto {
  @ApiProperty({ minimum: -90, maximum: 90, example: -8.7607 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLatitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -63.8999 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLongitude!: number;

  @ApiPropertyOptional({ minimum: 10, maximum: 120, example: 35 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(120)
  averageSpeedKmh?: number;

  @ApiProperty({ type: [RouteStopInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RouteStopInputDto)
  stops!: RouteStopInputDto[];
}

export class RiskEstimationInputDto {
  @ApiProperty({ minimum: 0, example: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  backlogSize!: number;

  @ApiProperty({ minimum: 0, example: 7 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overdueCount!: number;

  @ApiProperty({ minimum: 0, maximum: 720, example: 22 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(720)
  avgResolutionHours!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 12 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  reopenRatePercent!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 78 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  firstTimeFixRatePercent!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 84 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  teamAvailabilityPercent!: number;
}
