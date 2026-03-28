import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** HSL-компоненты как в CSS variables (в т.ч. с альфой: "227 55% 35% / 0.12") */
const HSL_VALUE = /^[\d.\s/%]+$/;

function tokenProp(description: string) {
  return ApiPropertyOptional({
    description,
    example: '230 90% 64%',
  });
}

export class ThemeTokensDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('primary')
  primary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('primaryForeground')
  primaryForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('background')
  background?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('foreground')
  foreground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('accent')
  accent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('accentForeground')
  accentForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('ring')
  ring?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('card')
  card?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('cardForeground')
  cardForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('muted')
  muted?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('mutedForeground')
  mutedForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('border')
  border?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('input')
  input?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('secondary')
  secondary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('secondaryForeground')
  secondaryForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('destructive')
  destructive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('destructiveForeground')
  destructiveForeground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('popover')
  popover?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(HSL_VALUE, { message: 'Invalid HSL token value' })
  @tokenProp('popoverForeground')
  popoverForeground?: string;
}
