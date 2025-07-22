import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel('Order') private orderModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Product') private productModel: Model<any>,
    @InjectModel('Customer') private customerModel: Model<any>,
    @InjectModel('Attendance') private attendanceModel: Model<any>,
    @InjectModel('Leave') private leaveModel: Model<any>,
  ) {}

  private checkFinancePermission(userRole: string): void {
    if (!['finance', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only Finance team and SuperAdmin can access financial data',
      );
    }
  }

  // Revenue Reports
  async getTotalRevenue(userRole: string): Promise<any> {
    this.checkFinancePermission(userRole);

    const revenueData = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $unwind: '$lines',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $multiply: ['$lines.qty', '$product.price'],
            },
          },
          ordersCount: { $sum: 1 },
          totalItemsSold: { $sum: '$lines.qty' },
        },
      },
    ]);

    return {
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      currency: 'EGP',
      ordersCount: revenueData[0]?.ordersCount || 0,
      totalItemsSold: revenueData[0]?.totalItemsSold || 0,
      generatedAt: new Date(),
    };
  }

  async getMonthlyRevenue(userRole: string, year?: number): Promise<any> {
    this.checkFinancePermission(userRole);

    const currentYear = year || new Date().getFullYear();

    const monthlyData = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $unwind: '$lines',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: {
            $sum: {
              $multiply: ['$lines.qty', '$product.price'],
            },
          },
          ordersCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.month': 1 },
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' },
                },
              },
            ],
          },
          revenue: 1,
          ordersCount: 1,
        },
      },
    ]);

    return {
      year: currentYear,
      months: monthlyData,
      totalRevenue: monthlyData.reduce((sum, month) => sum + month.revenue, 0),
    };
  }

  async getOrdersReport(userRole: string, query?: any): Promise<any> {
    this.checkFinancePermission(userRole);

    const filter: any = {};

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.startDate && query?.endDate) {
      filter.createdAt = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    const orders = await this.orderModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'salesPerson',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $unwind: '$salesPerson',
      },
      {
        $unwind: '$lines',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: '$_id',
          orderId: { $first: { $toString: '$_id' } },
          customer: { $first: '$customer.name' },
          customerEmail: { $first: '$customer.email' },
          salesPerson: { $first: '$salesPerson.fullName' },
          salesPersonRole: { $first: '$salesPerson.role' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
          totalAmount: {
            $sum: {
              $multiply: ['$lines.qty', '$product.price'],
            },
          },
          itemsCount: { $sum: '$lines.qty' },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return orders;
  }

  // Salary Reports
  async getSalariesReport(userRole: string): Promise<any> {
    this.checkFinancePermission(userRole);

    const salaries = await this.userModel.aggregate([
      {
        $group: {
          _id: '$role',
          employees: {
            $push: {
              userId: { $toString: '$_id' },
              fullName: '$fullName',
              email: '$email',
              salary: '$salary',
              status: '$status',
            },
          },
          totalSalary: { $sum: '$salary' },
          employeeCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalSalary: -1 },
      },
    ]);

    const totalPayroll = salaries.reduce(
      (sum, role) => sum + role.totalSalary,
      0,
    );

    return {
      totalPayroll,
      currency: 'EGP',
      byRole: salaries,
      totalEmployees: salaries.reduce(
        (sum, role) => sum + role.employeeCount,
        0,
      ),
    };
  }

  // Profit & Loss Report
  async getProfitReport(userRole: string): Promise<any> {
    this.checkFinancePermission(userRole);

    const revenueData = await this.getTotalRevenue(userRole);
    const salaryData = await this.getSalariesReport(userRole);

    // Calculate product costs (assuming 60% of selling price as cost)
    const productCosts = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
        },
      },
      {
        $unwind: '$lines',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: null,
          totalCost: {
            $sum: {
              $multiply: [
                '$lines.qty',
                { $multiply: ['$product.price', 0.6] }, // 60% cost ratio
              ],
            },
          },
        },
      },
    ]);

    const totalRevenue = revenueData.totalRevenue;
    const totalSalaries = salaryData.totalPayroll;
    const totalProductCosts = productCosts[0]?.totalCost || 0;
    const totalExpenses = totalSalaries + totalProductCosts;
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      expenses: {
        salaries: totalSalaries,
        productCosts: totalProductCosts,
        total: totalExpenses,
      },
      netProfit,
      profitMargin:
        totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
      currency: 'EGP',
      generatedAt: new Date(),
    };
  }

  // Sales Performance Report
  async getSalesPerformance(userRole: string): Promise<any> {
    this.checkFinancePermission(userRole);

    const salesPerformance = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'shipped'] },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'salesPerson',
        },
      },
      {
        $unwind: '$salesPerson',
      },
      {
        $unwind: '$lines',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'lines.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: '$createdBy',
          salesPerson: { $first: '$salesPerson.fullName' },
          salesPersonEmail: { $first: '$salesPerson.email' },
          role: { $first: '$salesPerson.role' },
          totalRevenue: {
            $sum: {
              $multiply: ['$lines.qty', '$product.price'],
            },
          },
          ordersCount: { $sum: 1 },
          totalItemsSold: { $sum: '$lines.qty' },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    return salesPerformance;
  }

  // Dashboard Overview
  async getDashboardOverview(userRole: string): Promise<any> {
    this.checkFinancePermission(userRole);

    const [revenue, salaries, orders, customers, products] = await Promise.all([
      this.getTotalRevenue(userRole),
      this.getSalariesReport(userRole),
      this.orderModel.countDocuments(),
      this.customerModel.countDocuments(),
      this.productModel.countDocuments(),
    ]);

    const pendingOrders = await this.orderModel.countDocuments({
      status: 'pending',
    });
    const confirmedOrders = await this.orderModel.countDocuments({
      status: 'confirmed',
    });
    const shippedOrders = await this.orderModel.countDocuments({
      status: 'shipped',
    });

    return {
      revenue: {
        total: revenue.totalRevenue,
        ordersCount: revenue.ordersCount,
      },
      expenses: {
        totalSalaries: salaries.totalPayroll,
        employeeCount: salaries.totalEmployees,
      },
      orders: {
        total: orders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
      },
      customers: {
        total: customers,
      },
      products: {
        total: products,
      },
      generatedAt: new Date(),
    };
  }

  // Attendance Cost Report
  async getAttendanceCostReport(userRole: string, query?: any): Promise<any> {
    this.checkFinancePermission(userRole);

    const filter: any = {};

    if (query?.startDate && query?.endDate) {
      filter.date = {
        $gte: query.startDate,
        $lte: query.endDate,
      };
    }

    const attendanceCosts = await this.attendanceModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$userId',
          fullName: { $first: '$user.fullName' },
          role: { $first: '$user.role' },
          salary: { $first: '$user.salary' },
          attendanceDays: { $sum: 1 },
          checkedOutDays: {
            $sum: {
              $cond: [{ $ne: ['$checkOutTime', null] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          role: 1,
          salary: 1,
          attendanceDays: 1,
          checkedOutDays: 1,
          dailySalary: { $divide: ['$salary', 30] }, // Assuming 30 working days per month
          earnedSalary: {
            $multiply: [{ $divide: ['$salary', 30] }, '$checkedOutDays'],
          },
        },
      },
    ]);

    return attendanceCosts;
  }
}
