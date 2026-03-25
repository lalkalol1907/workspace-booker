import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: [UserRole.ADMIN, UserRole.MEMBER] })
  @IsIn([UserRole.ADMIN, UserRole.MEMBER])
  role!: UserRole;
}
