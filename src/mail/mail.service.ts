import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { User, UserDocument } from '../users/users.schema';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendLoginMail(to: string, username: string) {
    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'login.ejs',
    );
    const html = await ejs.renderFile(templatePath, { username });

    await this.transporter.sendMail({
      from: `"ERP App" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Login Notification',
      html,
    });
  }

  async sendResetPasswordMail(to: string, code: string) {
    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'reset-password.ejs',
    );
    const html = await ejs.renderFile(templatePath, { code });
    await this.transporter.sendMail({
      from: `"ERP App" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Password Reset Code',
      html,
    });
  }

  // Order Email Methods
  async sendOrderCreatedEmail(order: any) {
    try {
      // Get recipients based on roles
      const recipients = await this.getOrderEmailRecipients([
        'sales',
        'salesManager',
        'superadmin',
      ]);

      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'order-created.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        orderId: order._id.toString().slice(-8).toUpperCase(),
        customer: order.customerId,
        salesPerson: order.createdBy,
        lines: order.lines,
        note: order.note,
        createdAt: order.createdAt,
      });

      // Send to each recipient
      for (const recipient of recipients) {
        await this.transporter.sendMail({
          from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: recipient.email,
          subject: `🆕 New Order Created - #${order._id.toString().slice(-8).toUpperCase()}`,
          html,
        });
      }

      console.log(
        `Order created email sent to ${recipients.length} recipients`,
      );
    } catch (error) {
      console.error('Error sending order created email:', error);
    }
  }

  async sendOrderConfirmedEmail(order: any) {
    try {
      // Send to sales person, inventory team, and superadmin
      const recipients = await this.getOrderEmailRecipients([
        'inventory',
        'superadmin',
      ]);

      // Also add the sales person who created the order
      const salesPerson = await this.userModel.findById(
        order.createdBy._id || order.createdBy,
      );
      if (salesPerson) {
        recipients.push(salesPerson);
      }

      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'order-confirmed.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        orderId: order._id.toString().slice(-8).toUpperCase(),
        customer: order.customerId,
        confirmedBy: order.confirmedBy,
        confirmedAt: order.confirmedAt,
      });

      for (const recipient of recipients) {
        await this.transporter.sendMail({
          from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: recipient.email,
          subject: `✅ Order Confirmed - #${order._id.toString().slice(-8).toUpperCase()}`,
          html,
        });
      }

      console.log(
        `Order confirmed email sent to ${recipients.length} recipients`,
      );
    } catch (error) {
      console.error('Error sending order confirmed email:', error);
    }
  }

  async sendOrderShippedEmail(order: any) {
    try {
      // Send to sales person, sales manager, and superadmin
      const recipients = await this.getOrderEmailRecipients([
        'sales',
        'salesManager',
        'superadmin',
      ]);

      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'order-shipped.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        orderId: order._id.toString().slice(-8).toUpperCase(),
        customer: order.customerId,
        shippedBy: order.shippedBy,
        shippedAt: order.shippedAt,
      });

      for (const recipient of recipients) {
        await this.transporter.sendMail({
          from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: recipient.email,
          subject: `🚚 Order Shipped - #${order._id.toString().slice(-8).toUpperCase()}`,
          html,
        });
      }

      console.log(
        `Order shipped email sent to ${recipients.length} recipients`,
      );
    } catch (error) {
      console.error('Error sending order shipped email:', error);
    }
  }

  async sendOrderCancelledEmail(order: any) {
    try {
      // Send to sales person and superadmin
      const recipients = await this.getOrderEmailRecipients([
        'sales',
        'salesManager',
        'superadmin',
      ]);

      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'order-cancelled.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        orderId: order._id.toString().slice(-8).toUpperCase(),
        customer: order.customerId,
        cancelledBy: order.cancelledBy,
        cancelledAt: order.cancelledAt,
      });

      for (const recipient of recipients) {
        await this.transporter.sendMail({
          from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: recipient.email,
          subject: `❌ Order Cancelled - #${order._id.toString().slice(-8).toUpperCase()}`,
          html,
        });
      }

      console.log(
        `Order cancelled email sent to ${recipients.length} recipients`,
      );
    } catch (error) {
      console.error('Error sending order cancelled email:', error);
    }
  }

  private async getOrderEmailRecipients(roles: string[]) {
    return this.userModel
      .find({
        role: { $in: roles },
        status: 'active',
      })
      .select('email fullName role');
  }

  // Attendance Email Methods
  async sendCheckInEmail(attendance: any) {
    try {
      // Send email to the employee
      await this.sendEmployeeCheckInEmail(attendance);

      // Send notification to HR and SuperAdmin
      await this.sendHRAttendanceNotification(attendance, 'check-in');

      console.log(`Check-in emails sent for ${attendance.userId.fullName}`);
    } catch (error) {
      console.error('Error sending check-in emails:', error);
    }
  }

  async sendCheckOutEmail(attendance: any) {
    try {
      // Send email to the employee
      await this.sendEmployeeCheckOutEmail(attendance);

      // Send notification to HR and SuperAdmin
      await this.sendHRAttendanceNotification(attendance, 'check-out');

      console.log(`Check-out emails sent for ${attendance.userId.fullName}`);
    } catch (error) {
      console.error('Error sending check-out emails:', error);
    }
  }

  private async sendEmployeeCheckInEmail(attendance: any) {
    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'attendance-check-in.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      employee: attendance.userId,
      checkInTime: attendance.checkInTime,
      date: attendance.date,
      note: attendance.note,
    });

    await this.transporter.sendMail({
      from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: attendance.userId.email,
      subject: `✅ Check-In Confirmed - ${new Date(attendance.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      html,
    });
  }

  private async sendEmployeeCheckOutEmail(attendance: any) {
    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'attendance-check-out.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      employee: attendance.userId,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      date: attendance.date,
      note: attendance.note,
    });

    await this.transporter.sendMail({
      from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: attendance.userId.email,
      subject: `🚪 Check-Out Confirmed - Day Completed!`,
      html,
    });
  }

  private async sendHRAttendanceNotification(
    attendance: any,
    actionType: 'check-in' | 'check-out',
  ) {
    // Get HR and SuperAdmin users
    const hrUsers = await this.userModel
      .find({
        role: { $in: ['hr', 'superadmin'] },
        status: 'active',
      })
      .select('email fullName role');

    if (hrUsers.length === 0) return;

    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'attendance-hr-notification.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      employee: attendance.userId,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      date: attendance.date,
      note: attendance.note,
      actionType,
    });

    const subject =
      actionType === 'check-in'
        ? `👥 Employee Check-In: ${attendance.userId.fullName}`
        : `👥 Employee Check-Out: ${attendance.userId.fullName}`;

    // Send to each HR user
    for (const hrUser of hrUsers) {
      await this.transporter.sendMail({
        from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: hrUser.email,
        subject,
        html,
      });
    }
  }

  // Leave Email Methods
  async sendLeaveRequestEmail(leave: any) {
    try {
      // Send confirmation email to the employee
      await this.sendEmployeeLeaveRequestEmail(leave);

      // Send notification to HR and SuperAdmin
      await this.sendHRLeaveNotification(leave);

      console.log(`Leave request emails sent for ${leave.userId.fullName}`);
    } catch (error) {
      console.error('Error sending leave request emails:', error);
    }
  }

  async sendLeaveApprovedEmail(leave: any) {
    try {
      // Send approval email to the employee
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'leave-approve.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: leave.userId,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        reviewedBy: leave.reviewedBy,
        reviewedAt: leave.reviewedAt,
        reviewNote: leave.reviewNote,
      });

      await this.transporter.sendMail({
        from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: leave.userId.email,
        subject: `✅ Leave Request Approved - ${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''} off!`,
        html,
      });

      // Send notification to HR team (excluding the reviewer if they are HR)
      await this.sendHRLeaveDecisionNotification(leave, 'approved');

      console.log(
        `Leave approved email sent to ${leave.userId.fullName} and HR team`,
      );
    } catch (error) {
      console.error('Error sending leave approved email:', error);
    }
  }

  async sendLeaveRejectedEmail(leave: any) {
    try {
      // Send rejection email to the employee
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'leave-rejected.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: leave.userId,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        reviewedBy: leave.reviewedBy,
        reviewedAt: leave.reviewedAt,
        reviewNote: leave.reviewNote,
      });

      await this.transporter.sendMail({
        from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: leave.userId.email,
        subject: `❌ Leave Request Update - Action Required`,
        html,
      });

      // Send notification to HR team (excluding the reviewer if they are HR)
      await this.sendHRLeaveDecisionNotification(leave, 'rejected');

      console.log(
        `Leave rejected email sent to ${leave.userId.fullName} and HR team`,
      );
    } catch (error) {
      console.error('Error sending leave rejected email:', error);
    }
  }

  private async sendEmployeeLeaveRequestEmail(leave: any) {
    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'leave-create.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      employee: leave.userId,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      reason: leave.reason,
    });

    await this.transporter.sendMail({
      from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: leave.userId.email,
      subject: `📝 Leave Request Submitted - ${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''}`,
      html,
    });
  }

  private async sendHRLeaveNotification(leave: any) {
    // Get HR and SuperAdmin users
    const hrUsers = await this.userModel
      .find({
        role: { $in: ['hr', 'superadmin'] },
        status: 'active',
      })
      .select('email fullName role');

    if (hrUsers.length === 0) return;

    const templatePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'leave-hr-notification.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      employee: leave.userId,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      reason: leave.reason,
      createdAt: leave.createdAt,
    });

    const subject = `👥 New Leave Request: ${leave.userId.fullName} - ${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''}`;

    // Send to each HR user
    for (const hrUser of hrUsers) {
      await this.transporter.sendMail({
        from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: hrUser.email,
        subject,
        html,
      });
    }
  }

  private async sendHRLeaveDecisionNotification(
    leave: any,
    status: 'approved' | 'rejected',
  ) {
    try {
      // Get ALL HR and SuperAdmin users
      const hrUsers = await this.userModel
        .find({
          role: { $in: ['hr', 'superadmin'] },
          status: 'active',
        })
        .select('email fullName role');

      if (hrUsers.length === 0) return;

      const reviewerId = leave.reviewedBy._id || leave.reviewedBy;

      // Send to ALL HR users with appropriate template
      for (const hrUser of hrUsers) {
        const isReviewer =
          (hrUser._id as any).toString() === reviewerId.toString();

        // Choose template based on whether this is the reviewer or not
        const templatePath = join(
          process.cwd(),
          'src',
          'mail',
          'templates',
          isReviewer
            ? 'leave-decision-confirmation.ejs'
            : 'leave-hr-approval-notification.ejs',
        );

        const html = await ejs.renderFile(templatePath, {
          employee: leave.userId,
          startDate: leave.startDate,
          endDate: leave.endDate,
          totalDays: leave.totalDays,
          reason: leave.reason,
          reviewedBy: leave.reviewedBy,
          reviewedAt: leave.reviewedAt,
          reviewNote: leave.reviewNote,
          status,
        });

        let subject;
        if (isReviewer) {
          subject =
            status === 'approved'
              ? `✅ Confirmation: You Approved Leave for ${leave.userId.fullName}`
              : `❌ Confirmation: You Rejected Leave for ${leave.userId.fullName}`;
        } else {
          subject =
            status === 'approved'
              ? `✅ Leave Approved: ${leave.userId.fullName} - ${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''}`
              : `❌ Leave Rejected: ${leave.userId.fullName} - ${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''}`;
        }

        await this.transporter.sendMail({
          from: `"ERP System" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: hrUser.email,
          subject,
          html,
        });
      }

      console.log(
        `HR decision notification sent to ${hrUsers.length} HR team members (including reviewer)`,
      );
    } catch (error) {
      console.error('Error sending HR decision notification:', error);
    }
  }
}
