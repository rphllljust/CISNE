import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min
} from 'class-validator';

export enum DocumentSourceType {
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  EMAIL = 'EMAIL',
  FORM = 'FORM'
}

export enum ExtractionFieldStatus {
  OK = 'OK',
  MISSING = 'MISSING',
  INVALID = 'INVALID',
  AMBIGUOUS = 'AMBIGUOUS'
}

export class ExtractDocumentDto {
  @IsEnum(DocumentSourceType)
  sourceType: DocumentSourceType;

  /** Base64 encoded content OR plain text for EMAIL/FORM */
  @IsString()
  content: string;

  /** Optional: service order ID to link extraction to existing OS */
  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  /** Optional: client ID for history lookup */
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class CorrectExtractionDto {
  @IsString()
  extractionId: string;

  @IsObject()
  corrections: Record<string, string | number | null>;
}

export class ProcessDocumentAndCreateOsDto {
  @IsEnum(DocumentSourceType)
  sourceType: DocumentSourceType;

  @IsString()
  content: string;

  /** If provided, skip extraction for these fields and use supplied values */
  @IsOptional()
  @IsObject()
  overrides?: Record<string, string | number | null>;

  /** The service type ID to use when creating the OS */
  @IsOptional()
  @IsString()
  serviceTypeId?: string;
}

export class BudgetApprovalDto {
  @IsString()
  serviceOrderId: string;

  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListExtractionsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(DocumentSourceType)
  sourceType?: DocumentSourceType;

  /** Filter by serviceOrderId */
  @IsOptional()
  @IsString()
  serviceOrderId?: string;
}
