import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, IsUUID, Length } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  resourceId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  title!: string;
}
