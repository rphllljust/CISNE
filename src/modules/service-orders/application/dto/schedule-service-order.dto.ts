import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ScheduleServiceOrderDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  scheduledStart!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  scheduledEnd!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Id do agendamento anterior, em caso de reagendamento' })
  @IsOptional()
  @IsUUID()
  rescheduledFromId?: string;
}
