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
  Patch,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto, ReviewLeaveDto } from './dto/update-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(@Body() createLeaveDto: CreateLeaveDto, @Request() req) {
    return this.leaveService.create(createLeaveDto, req.user.id, req.user.role);
  }

  @Get()
  findAll(@Request() req, @Query() query) {
    return this.leaveService.findAll(req.user.role, query);
  }

  @Get('my-leaves')
  findMyLeaves(@Request() req) {
    return this.leaveService.findMyLeaves(req.user.id);
  }

  @Get('stats')
  getLeaveStats(@Request() req, @Query() query) {
    return this.leaveService.getLeaveStats(req.user.role, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.leaveService.findOne(id, req.user.role, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
    @Request() req,
  ) {
    return this.leaveService.update(
      id,
      updateLeaveDto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/approve')
  approveLeave(
    @Param('id') id: string,
    @Body() reviewDto: ReviewLeaveDto,
    @Request() req,
  ) {
    return this.leaveService.approveLeave(
      id,
      reviewDto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/reject')
  rejectLeave(
    @Param('id') id: string,
    @Body() reviewDto: ReviewLeaveDto,
    @Request() req,
  ) {
    return this.leaveService.rejectLeave(
      id,
      reviewDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.leaveService.remove(id, req.user.role, req.user.id);
  }
}
