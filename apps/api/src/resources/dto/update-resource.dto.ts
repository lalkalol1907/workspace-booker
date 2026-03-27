import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

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
  metadata?: Record<string, unknown> | null;
}
