import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class MeResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({
    description: 'If true, user must set a new password before using the app.',
  })
  mustChangePassword!: boolean;

  @ApiProperty({
    nullable: true,
    description:
      'Tenant organization name. Null for platform super_admin without a linked org.',
  })
  organizationName!: string | null;
}
