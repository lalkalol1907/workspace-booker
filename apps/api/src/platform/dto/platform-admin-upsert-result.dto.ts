import { ApiProperty } from '@nestjs/swagger';

export class PlatformAdminUpsertResultDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({
    enum: ['created', 'promoted', 'already_super_admin'],
  })
  action!: 'created' | 'promoted' | 'already_super_admin';

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Temporary password, returned only when a new platform admin is created.',
  })
  temporaryPassword?: string | null;
}
