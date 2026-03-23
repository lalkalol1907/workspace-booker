import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

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
    description: 'Hostname for this tenant (e.g. booker.acme.com)',
  })
  @IsString()
  @Length(1, 255)
  host!: string;
}
