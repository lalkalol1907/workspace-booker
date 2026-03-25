import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../common/enums/booking-status.enum';

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  resourceId!: string;

  @ApiProperty()
  resourceName!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({
    description: 'Display name of booking user (if joined)',
  })
  userDisplayName!: string;

  @ApiProperty({
    description: 'Email of booking user (if joined)',
  })
  userEmail!: string;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
