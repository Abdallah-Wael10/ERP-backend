import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/customers.schema';
import { Product, ProductDocument } from '../products/product.schema';
import { Order, OrderDocument } from '../orders/order.schema';
import { User, UserDocument } from '../users/users.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/attendance.schema';
import { Leave, LeaveDocument } from '../leaves/leave.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
  ) {}

  async getDashboardData(userId: string, userRole: string): Promise<any> {
    switch (userRole) {
      case 'superadmin':
        return this.getSuperAdminDashboard();
      case 'hr':
        return this.getHRDashboard();
      case 'salesManager':
        return this.getSalesManagerDashboard();
      case 'sales':
        return this.getSalesDashboard(userId);
      case 'inventory':
        return this.getInventoryDashboard();
      case 'finance':
        return this.getFinanceDashboard();
      case 'employee':
        return this.getEmployeeDashboard(userId);
      default:
        throw new ForbiddenException('Invalid user role');
    }
  }

  // SuperAdmin Dashboard - Overview of everything
  private async getSuperAdminDashboard(): Promise<any> {
    const [
      totalUsers,
      totalCustomers,
      totalProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      totalRevenue,
      pendingLeaves,
      todayAttendance,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.customerModel.countDocuments(),
      this.productModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'pending' }),
      this.orderModel.countDocuments({ status: 'confirmed' }),
      this.orderModel.countDocuments({ status: 'shipped' }),
      this.calculateTotalRevenue(),
      this.leaveModel.countDocuments({ status: 'pending' }),
      this.getTodayAttendanceCount(),
    ]);

    const recentOrders = await this.orderModel
      .find()
      .populate('customerId', 'name email')
      .populate('createdBy', 'fullName role')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    return {
      userRole: 'superadmin',
      overview: {
        totalUsers,
        totalCustomers,
        totalProducts,
        totalOrders,
        totalRevenue,
      },
      orders: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
        recent: recentOrders,
      },
      hr: {
        pendingLeaves,
        todayAttendance,
      },
    };
  }

  // HR Dashboard - User management, attendance, leaves
  private async getHRDashboard(): Promise<any> {
    const [
      totalEmployees,
      activeEmployees,
      suspendedEmployees,
      todayAttendance,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
    ] = await Promise.all([
      this.userModel.countDocuments({ role: { $ne: 'superadmin' } }),
      this.userModel.countDocuments({
        status: 'active',
        role: { $ne: 'superadmin' },
      }),
      this.userModel.countDocuments({ status: 'suspended' }),
      this.getTodayAttendanceCount(),
      this.leaveModel.countDocuments({ status: 'pending' }),
      this.leaveModel.countDocuments({ status: 'approved' }),
      this.leaveModel.countDocuments({ status: 'rejected' }),
    ]);

    const recentLeaves = await this.leaveModel
      .find({ status: 'pending' })
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    const attendanceStats = await this.getAttendanceStats();

    return {
      userRole: 'hr',
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        suspended: suspendedEmployees,
      },
      attendance: {
        today: todayAttendance,
        stats: attendanceStats,
      },
      leaves: {
        pending: pendingLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves,
        recent: recentLeaves,
      },
    };
  }

  // Sales Manager Dashboard - All sales data and team performance
  private async getSalesManagerDashboard(): Promise<any> {
    const [
      totalCustomers,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      totalRevenue,
      salesTeamSize,
    ] = await Promise.all([
      this.customerModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'pending' }),
      this.orderModel.countDocuments({ status: 'confirmed' }),
      this.calculateTotalRevenue(),
      this.userModel.countDocuments({ role: 'sales' }),
    ]);

    const salesPerformance = await this.getSalesTeamPerformance();
    const recentOrders = await this.orderModel
      .find()
      .populate('customerId', 'name email')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    return {
      userRole: 'salesManager',
      overview: {
        totalCustomers,
        totalOrders,
        totalRevenue,
        salesTeamSize,
      },
      orders: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        recent: recentOrders,
      },
      team: {
        performance: salesPerformance,
      },
    };
  }

  // Sales Dashboard - Own customers and orders
  private async getSalesDashboard(userId: string): Promise<any> {
    const [
      myCustomers,
      myOrders,
      myPendingOrders,
      myConfirmedOrders,
      myRevenue,
    ] = await Promise.all([
      this.customerModel.countDocuments({ userId }),
      this.orderModel.countDocuments({ createdBy: userId }),
      this.orderModel.countDocuments({ createdBy: userId, status: 'pending' }),
      this.orderModel.countDocuments({
        createdBy: userId,
        status: 'confirmed',
      }),
      this.calculateUserRevenue(userId),
    ]);

    const recentOrders = await this.orderModel
      .find({ createdBy: userId })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    const recentCustomers = await this.customerModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    return {
      userRole: 'sales',
      overview: {
        myCustomers,
        myOrders,
        myRevenue,
      },
      orders: {
        pending: myPendingOrders,
        confirmed: myConfirmedOrders,
        recent: recentOrders,
      },
      customers: {
        recent: recentCustomers,
      },
    };
  }

  // Inventory Dashboard - Products and stock management
  private async getInventoryDashboard(): Promise<any> {
    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      ordersToShip,
    ] = await Promise.all([
      this.productModel.countDocuments(),
      this.productModel.countDocuments({ qty: { $lte: 10, $gt: 0 } }),
      this.productModel.countDocuments({ qty: 0 }),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'confirmed' }),
    ]);

    const lowStockItems = await this.productModel
      .find({ qty: { $lte: 10, $gt: 0 } })
      .sort({ qty: 1 })
      .limit(5)
      .exec();

    const ordersToProcess = await this.orderModel
      .find({ status: 'confirmed' })
      .populate('customerId', 'name email')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: 1 })
      .limit(5)
      .exec();

    return {
      userRole: 'inventory',
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        lowStockItems: lowStockItems,
      },
      orders: {
        total: totalOrders,
        toShip: ordersToShip,
        pending: ordersToProcess,
      },
    };
  }

  // Finance Dashboard - Revenue and financial reports
  private async getFinanceDashboard(): Promise<any> {
    const [totalRevenue, monthlyRevenue, totalOrders, totalPayroll] =
      await Promise.all([
        this.calculateTotalRevenue(),
        this.calculateMonthlyRevenue(),
        this.orderModel.countDocuments({
          status: { $in: ['confirmed', 'shipped'] },
        }),
        this.calculateTotalPayroll(),
      ]);

    const revenueByMonth = await this.getRevenueByMonth();

    return {
      userRole: 'finance',
      revenue: {
        total: totalRevenue,
        thisMonth: monthlyRevenue,
        byMonth: revenueByMonth,
      },
      orders: {
        totalPaid: totalOrders,
      },
      expenses: {
        totalPayroll,
      },
    };
  }

  // Employee Dashboard - Personal attendance and leave data
  private async getEmployeeDashboard(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    const [
      todayAttendance,
      monthlyAttendance,
      myLeaves,
      pendingLeaves,
      approvedLeaves,
    ] = await Promise.all([
      this.attendanceModel.findOne({ userId, date: today }),
      this.attendanceModel.countDocuments({
        userId,
        date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split('T')[0],
        },
      }),
      this.leaveModel.countDocuments({ userId }),
      this.leaveModel.countDocuments({ userId, status: 'pending' }),
      this.leaveModel.countDocuments({ userId, status: 'approved' }),
    ]);

    const recentAttendance = await this.attendanceModel
      .find({ userId })
      .sort({ date: -1 })
      .limit(5)
      .exec();

    const recentLeaves = await this.leaveModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    return {
      userRole: 'employee',
      attendance: {
        today: todayAttendance,
        thisMonth: monthlyAttendance,
        recent: recentAttendance,
      },
      leaves: {
        total: myLeaves,
        pending: pendingLeaves,
        approved: approvedLeaves,
        recent: recentLeaves,
      },
    };
  }

  // Helper methods
  private async calculateTotalRevenue(): Promise<number> {
    const result = await this.orderModel.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped'] } } },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$lines.qty', '$product.price'] } },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  private async calculateUserRevenue(userId: string): Promise<number> {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdBy: userId,
          status: { $in: ['confirmed', 'shipped'] },
        },
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$lines.qty', '$product.price'] } },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  private async calculateMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const result = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
          createdAt: { $gte: startOfMonth },
        },
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$lines.qty', '$product.price'] } },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  private async calculateTotalPayroll(): Promise<number> {
    const result = await this.userModel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$salary' } } },
    ]);
    return result[0]?.total || 0;
  }

  private async getTodayAttendanceCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    return this.attendanceModel.countDocuments({ date: today });
  }

  private async getAttendanceStats(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const [checkedIn, checkedOut] = await Promise.all([
      this.attendanceModel.countDocuments({ date: today }),
      this.attendanceModel.countDocuments({
        date: today,
        checkOutTime: { $exists: true },
      }),
    ]);

    return {
      checkedIn,
      checkedOut,
      stillInOffice: checkedIn - checkedOut,
    };
  }

  private async getSalesTeamPerformance(): Promise<any> {
    return this.orderModel.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped'] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'salesperson',
        },
      },
      { $unwind: '$salesperson' },
      { $match: { 'salesperson.role': 'sales' } },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$salesperson._id',
          name: { $first: '$salesperson.fullName' },
          ordersCount: { $sum: 1 },
          revenue: { $sum: { $multiply: ['$lines.qty', '$product.price'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);
  }

  private async getRevenueByMonth(): Promise<any> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: { $multiply: ['$lines.qty', '$product.price'] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }
}
