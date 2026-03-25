import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreatePlatformOrganizationDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty({ description: 'URL-safe slug' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(1, 128)
  slug!: string;

  @ApiProperty({
    type: [String],
    description:
      'Hostnames for this tenant (e.g. booker.acme.com). At least one; each must be unique on the platform.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 255, { each: true })
  hosts!: string[];
}
