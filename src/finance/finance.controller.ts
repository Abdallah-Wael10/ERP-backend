import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('revenue')
  getTotalRevenue(@Request() req) {
    return this.financeService.getTotalRevenue(req.user.role);
  }

  @Get('revenue/monthly')
  getMonthlyRevenue(@Request() req, @Query('year') year?: string) {
    return this.financeService.getMonthlyRevenue(
      req.user.role,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('orders')
  getOrdersReport(@Request() req, @Query() query) {
    return this.financeService.getOrdersReport(req.user.role, query);
  }

  @Get('salaries')
  getSalariesReport(@Request() req) {
    return this.financeService.getSalariesReport(req.user.role);
  }

  @Get('profit')
  getProfitReport(@Request() req) {
    return this.financeService.getProfitReport(req.user.role);
  }

  @Get('sales-performance')
  getSalesPerformance(@Request() req) {
    return this.financeService.getSalesPerformance(req.user.role);
  }

  @Get('dashboard')
  getDashboardOverview(@Request() req) {
    return this.financeService.getDashboardOverview(req.user.role);
  }

  @Get('attendance-costs')
  getAttendanceCostReport(@Request() req, @Query() query) {
    return this.financeService.getAttendanceCostReport(req.user.role, query);
  }
}
