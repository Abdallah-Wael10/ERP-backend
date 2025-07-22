import { IsDateString, IsOptional, IsString } from 'class-validator';

export class EditAttendanceDto {
  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
