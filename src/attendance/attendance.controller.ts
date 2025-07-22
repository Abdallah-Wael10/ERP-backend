import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in-attendance.dto';
import { CheckOutDto } from './dto/check-out-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('/api/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto, @Request() req) {
    return this.attendanceService.checkIn(
      checkInDto,
      req.user.id,
      req.user.role,
    );
  }

  @Post('check-out')
  checkOut(@Body() checkOutDto: CheckOutDto, @Request() req) {
    return this.attendanceService.checkOut(
      checkOutDto,
      req.user.id,
      req.user.role,
    );
  }
 
  @Get()
  findAll(@Request() req, @Query() query) {
    return this.attendanceService.findAll(req.user.role, query);
  }

  @Get('my-attendance')
  findMyAttendance(@Request() req) {
    return this.attendanceService.findMyAttendance(req.user.id);
  }

  @Get('today')
  getTodayAttendance(@Request() req) {
    return this.attendanceService.getTodayAttendance(req.user.id);
  }

  @Get('stats')
  getAttendanceStats(@Request() req, @Query() query) {
    return this.attendanceService.getAttendanceStats(req.user.role, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.attendanceService.findOne(id, req.user.role, req.user.id);
  }

  @Put(':id')
  editAttendance(
    @Param('id') id: string,
    @Body() editAttendanceDto: EditAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.editAttendance(
      id,
      editAttendanceDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.attendanceService.remove(id, req.user.role);
  }
}
