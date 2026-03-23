import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '../../common/enums/resource-type.enum';

export class ResourceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  locationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ResourceType })
  type!: ResourceType;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}
