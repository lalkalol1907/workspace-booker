import { ApiProperty } from '@nestjs/swagger';

export class OrganizationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: [String], description: 'Hostnames for tenant login' })
  hosts!: string[];

  @ApiProperty()
  createdAt!: Date;
}
