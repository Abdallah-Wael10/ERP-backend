import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Customer, CustomerSchema } from '../customers/customers.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Order, OrderSchema } from '../orders/order.schema';
import { User, UserSchema } from '../users/users.schema';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { Leave, LeaveSchema } from '../leaves/leave.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
