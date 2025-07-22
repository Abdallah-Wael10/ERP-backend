import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';
import { CreateLeaveDto } from './create-leave.dto';

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}

export class ReviewLeaveDto {
  @IsString()
  @IsOptional()
  reviewNote?: string;
}
