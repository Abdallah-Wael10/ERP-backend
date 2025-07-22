import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leave, LeaveDocument } from './leave.schema';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto, ReviewLeaveDto } from './dto/update-leave.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class LeaveService {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    private mailService: MailService,
  ) {}

  private calculateTotalDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    return diffDays;
  }

  async create(
    createLeaveDto: CreateLeaveDto,
    userId: string,
    userRole: string,
  ): Promise<Leave> {
    // SuperAdmin cannot apply for leave
    if (userRole === 'superadmin') {
      throw new ForbiddenException(
        'SuperAdmin does not need to apply for leave',
      );
    }

    const startDate = new Date(createLeaveDto.startDate);
    const endDate = new Date(createLeaveDto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Check for overlapping leaves
    const overlappingLeave = await this.leaveModel.findOne({
      userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlappingLeave) {
      throw new ConflictException(
        'You already have a leave request for this period',
      );
    }

    const totalDays = this.calculateTotalDays(startDate, endDate);

    const leave = new this.leaveModel({
      ...createLeaveDto,
      userId,
      startDate,
      endDate,
      totalDays,
      status: 'pending',
    });

    const savedLeave = await leave.save();

    // Populate leave for email
    const populatedLeave = await this.leaveModel
      .findById(savedLeave._id)
      .populate('userId', 'fullName email role')
      .exec();

    if (!populatedLeave) {
      throw new NotFoundException('Leave request not found after creation');
    }

    // Send email notifications
    await this.mailService.sendLeaveRequestEmail(populatedLeave);

    return populatedLeave;
  }

  async findAll(userRole: string, query?: any): Promise<Leave[]> {
    // Only HR and superadmin can view all leave requests
    if (!['hr', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can view all leave requests',
      );
    }

    const filter = {};

    // Add status filter if provided
    if (query?.status) {
      filter['status'] = query.status;
    }

    // Add user filter if provided
    if (query?.userId) {
      filter['userId'] = query.userId;
    }

    // Add date range filter if provided
    if (query?.startDate && query?.endDate) {
      filter['startDate'] = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    return this.leaveModel
      .find(filter)
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findMyLeaves(userId: string): Promise<Leave[]> {
    return this.leaveModel
      .find({ userId })
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userRole: string, userId?: string): Promise<Leave> {
    const leave = await this.leaveModel
      .findById(id)
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .exec();

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Users can only view their own leave requests, HR and superadmin can view all
    if (
      !['hr', 'superadmin'].includes(userRole) &&
      leave.userId._id.toString() !== userId
    ) {
      throw new ForbiddenException('You can only view your own leave requests');
    }

    return leave;
  }

  async update(
    id: string,
    updateLeaveDto: UpdateLeaveDto,
    userId: string,
    userRole: string,
  ): Promise<Leave> {
    const leave = await this.leaveModel.findById(id);
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Users can only update their own pending leave requests
    if (userRole !== 'superadmin' && userRole !== 'hr') {
      if (leave.userId.toString() !== userId) {
        throw new ForbiddenException(
          'You can only update your own leave requests',
        );
      }
      if (leave.status !== 'pending') {
        throw new ForbiddenException(
          'You can only update pending leave requests',
        );
      }
    }

    // If dates are being updated, validate them
    if (updateLeaveDto.startDate || updateLeaveDto.endDate) {
      const startDate = updateLeaveDto.startDate
        ? new Date(updateLeaveDto.startDate)
        : leave.startDate;
      const endDate = updateLeaveDto.endDate
        ? new Date(updateLeaveDto.endDate)
        : leave.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      if (
        startDate < new Date() &&
        userRole !== 'superadmin' &&
        userRole !== 'hr'
      ) {
        throw new BadRequestException('Start date cannot be in the past');
      }

      // Check for overlapping leaves (exclude current leave)
      const overlappingLeave = await this.leaveModel.findOne({
        _id: { $ne: id },
        userId: leave.userId,
        status: { $in: ['pending', 'approved'] },
        $or: [
          {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        ],
      });

      if (overlappingLeave) {
        throw new ConflictException(
          'There is already a leave request for this period',
        );
      }

      // Update total days
      updateLeaveDto['totalDays'] = this.calculateTotalDays(startDate, endDate);
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(id, updateLeaveDto, { new: true })
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .exec();

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    return updatedLeave;
  }

  async approveLeave(
    id: string,
    reviewDto: ReviewLeaveDto,
    reviewerId: string,
    reviewerRole: string,
  ): Promise<Leave> {
    // Only HR and superadmin can approve leave requests
    if (!['hr', 'superadmin'].includes(reviewerRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can approve leave requests',
      );
    }

    const leave = await this.leaveModel.findById(id);
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException(
        'Only pending leave requests can be approved',
      );
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(
        id,
        {
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: reviewDto.reviewNote,
        },
        { new: true },
      )
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .exec();

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    // Send email notification
    await this.mailService.sendLeaveApprovedEmail(updatedLeave);

    return updatedLeave;
  }

  async rejectLeave(
    id: string,
    reviewDto: ReviewLeaveDto,
    reviewerId: string,
    reviewerRole: string,
  ): Promise<Leave> {
    // Only HR and superadmin can reject leave requests
    if (!['hr', 'superadmin'].includes(reviewerRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can reject leave requests',
      );
    }

    const leave = await this.leaveModel.findById(id);
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException(
        'Only pending leave requests can be rejected',
      );
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(
        id,
        {
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: reviewDto.reviewNote,
        },
        { new: true },
      )
      .populate('userId', 'fullName email role')
      .populate('reviewedBy', 'fullName email role')
      .exec();

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    // Send email notification
    await this.mailService.sendLeaveRejectedEmail(updatedLeave);

    return updatedLeave;
  }

  async remove(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<{ message: string }> {
    const leave = await this.leaveModel.findById(id);
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Users can only delete their own pending leave requests
    if (userRole !== 'superadmin' && userRole !== 'hr') {
      if (leave.userId.toString() !== userId) {
        throw new ForbiddenException(
          'You can only delete your own leave requests',
        );
      }
      if (leave.status !== 'pending') {
        throw new ForbiddenException(
          'You can only delete pending leave requests',
        );
      }
    }

    await this.leaveModel.findByIdAndDelete(id);
    return { message: 'Leave request deleted successfully' };
  }

  async getLeaveStats(userRole: string, query?: any): Promise<any> {
    if (!['hr', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only HR and SuperAdmin can view leave statistics',
      );
    }

    const filter = {};

    if (query?.startDate && query?.endDate) {
      filter['startDate'] = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    const stats = await this.leaveModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            userId: '$userId',
            status: '$status',
          },
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          leaves: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalDays: '$totalDays',
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
          leaves: 1,
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
