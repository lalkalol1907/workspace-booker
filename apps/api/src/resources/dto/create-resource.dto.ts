import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ResourceType } from '../../common/enums/resource-type.enum';

export class CreateResourceDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  type!: ResourceType;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Максимальная длительность одной брони в минутах. null = без ограничения.',
    example: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBookingMinutes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
