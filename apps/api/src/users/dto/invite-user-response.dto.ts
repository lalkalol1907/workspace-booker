import { ApiProperty } from '@nestjs/swagger';

export class InviteUserResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({
    description:
      'Temporary password; shown only once. Share it with the user securely.',
  })
  temporaryPassword!: string;
}
