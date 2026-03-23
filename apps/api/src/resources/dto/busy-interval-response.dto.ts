import { ApiProperty } from '@nestjs/swagger';

export class BusyIntervalResponseDto {
  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty()
  bookingId!: string;
}
