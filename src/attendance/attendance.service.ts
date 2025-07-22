import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './attendance.schema';
import { CheckInDto } from './dto/check-in-attendance.dto';
import { CheckOutDto } from './dto/check-out-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private mailService: MailService,
  ) {}

  async checkIn(
    checkInDto: CheckInDto,
    userId: string,
    userRole: string,
  ): Promise<Attendance> {
    // All roles except superadmin can check in
    if (userRole === 'superadmin') {
      throw new ForbiddenException('SuperAdmin does not need to check in');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if user already checked in today
    const existingAttendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });

    if (existingAttendance) {
      throw new ConflictException('You have already checked in today');
    }

    const attendance = new this.attendanceModel({
      userId,
      checkInTime: new Date(),
      date: today,
      note: checkInDto.note,
    });

    const savedAttendance = await attendance.save();

    // Populate attendance for email
    const populatedAttendance = await this.attendanceModel
      .findById(savedAttendance._id)
      .populate('userId', 'fullName email role')
      .exec();

    if (!populatedAttendance) {
      throw new NotFoundException('Attendance record not found after creation');
    }

    // Send email notifications
    await this.mailService.sendCheckInEmail(populatedAttendance);

    return populatedAttendance;
  }

  async checkOut(
    checkOutDto: CheckOutDto,
    userId: string,
    userRole: string,
  ): Promise<Attendance> {
    // All roles except superadmin can check out
    if (userRole === 'superadmin') {
      throw new ForbiddenException('SuperAdmin does not need to check out');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const attendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });

    if (!attendance) {
      throw new NotFoundException('You need to check in first');
    }

    if (attendance.checkOutTime) {
      throw new ConflictException('You have already checked out today');
    }

    const updatedAttendance = await this.attendanceModel
      .findByIdAndUpdate(
        attendance._id,
        {
          checkOutTime: new Date(),
          note: checkOutDto.note || attendance.note,
        },
        { new: true },
      )
      .populate('userId', 'fullName email role')
      .exec();

    if (!updatedAttendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Send email notifications
    await this.mailService.sendCheckOutEmail(updatedAttendance);

    return updatedAttendance;
  }

  async findAll(userRole: string, query?: any): Promise<Attendance[]> {
    // Only HR and superadmin can view all attendance records
    if (!['hr', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can view attendance records',
      );
    }

    const filter = {};

    // Add date range filter if provided
    if (query?.startDate && query?.endDate) {
      filter['date'] = {
        $gte: query.startDate,
        $lte: query.endDate,
      };
    }

    // Add user filter if provided
    if (query?.userId) {
      filter['userId'] = query.userId;
    }

    return this.attendanceModel
      .find(filter)
      .populate('userId', 'fullName email role')
      .populate('editedBy', 'fullName email role')
      .sort({ date: -1, checkInTime: -1 })
      .exec();
  }

  async findMyAttendance(userId: string): Promise<Attendance[]> {
    return this.attendanceModel
      .find({ userId })
      .populate('userId', 'fullName email role')
      .populate('editedBy', 'fullName email role')
      .sort({ date: -1 })
      .exec();
  }

  async findOne(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel
      .findById(id)
      .populate('userId', 'fullName email role')
      .populate('editedBy', 'fullName email role')
      .exec();

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Users can only view their own attendance, HR and superadmin can view all
    if (
      !['hr', 'superadmin'].includes(userRole) &&
      attendance.userId._id.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only view your own attendance records',
      );
    }

    return attendance;
  }

  async editAttendance(
    id: string,
    editAttendanceDto: EditAttendanceDto,
    editorId: string,
    editorRole: string,
  ): Promise<Attendance> {
    // Only HR and superadmin can edit attendance
    if (!['hr', 'superadmin'].includes(editorRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can edit attendance records',
      );
    }

    const attendance = await this.attendanceModel.findById(id);
    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Validate check-out time is after check-in time
    if (editAttendanceDto.checkInTime && editAttendanceDto.checkOutTime) {
      const checkIn = new Date(editAttendanceDto.checkInTime);
      const checkOut = new Date(editAttendanceDto.checkOutTime);

      if (checkOut <= checkIn) {
        throw new BadRequestException(
          'Check-out time must be after check-in time',
        );
      }
    }

    const updateData: any = {
      editedBy: editorId,
      editedAt: new Date(),
    };

    if (editAttendanceDto.checkInTime) {
      updateData.checkInTime = new Date(editAttendanceDto.checkInTime);
    }

    if (editAttendanceDto.checkOutTime) {
      updateData.checkOutTime = new Date(editAttendanceDto.checkOutTime);
    }

    if (editAttendanceDto.note !== undefined) {
      updateData.note = editAttendanceDto.note;
    }

    const updatedAttendance = await this.attendanceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email role')
      .populate('editedBy', 'fullName email role')
      .exec();

    if (!updatedAttendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return updatedAttendance;
  }

  async remove(id: string, userRole: string): Promise<{ message: string }> {
    // Only superadmin can delete attendance records
    if (userRole !== 'superadmin') {
      throw new ForbiddenException(
        'Only SuperAdmin can delete attendance records',
      );
    }

    const attendance = await this.attendanceModel.findById(id);
    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.attendanceModel.findByIdAndDelete(id);
    return { message: 'Attendance record deleted successfully' };
  }

  async getTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];

    return this.attendanceModel
      .findOne({ userId, date: today })
      .populate('userId', 'fullName email role')
      .exec();
  }

  async getAttendanceStats(userRole: string, query?: any): Promise<any> {
    if (!['hr', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can view attendance statistics',
      );
    }

    const filter = {};

    if (query?.startDate && query?.endDate) {
      filter['date'] = {
        $gte: query.startDate,
        $lte: query.endDate,
      };
    }

    const stats = await this.attendanceModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          totalDays: { $sum: 1 },
          checkedOutDays: {
            $sum: {
              $cond: [{ $ne: ['$checkOutTime', null] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 1,
          totalDays: 1,
          checkedOutDays: 1,
          incompleteDays: { $subtract: ['$totalDays', '$checkedOutDays'] },
          user: {
            fullName: '$user.fullName',
            email: '$user.email',
            role: '$user.role',
          },
        },
      },
    ]);

    return stats;
  }
}
