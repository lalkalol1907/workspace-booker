import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ThemeTokensDto } from './theme-tokens.dto';

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional({ type: ThemeTokensDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeTokensDto)
  light?: ThemeTokensDto;

  @ApiPropertyOptional({ type: ThemeTokensDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeTokensDto)
  dark?: ThemeTokensDto;
}
