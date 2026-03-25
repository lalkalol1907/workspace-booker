import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpsertPlatformAdminDto {
  @ApiProperty()
  @IsEmail()
  @Length(3, 320)
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  displayName?: string;
}
