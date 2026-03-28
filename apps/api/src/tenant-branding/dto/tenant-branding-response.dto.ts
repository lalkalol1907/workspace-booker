import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantBrandingResponseDto {
  @ApiProperty()
  organizationId!: string;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: { type: 'string' },
  })
  light?: Record<string, string>;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: { type: 'string' },
  })
  dark?: Record<string, string>;
}

export class PublicTenantBrandingWrapperDto {
  @ApiPropertyOptional({ nullable: true })
  organizationId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  light!: Record<string, string> | null;

  @ApiPropertyOptional({ nullable: true })
  dark!: Record<string, string> | null;
}
