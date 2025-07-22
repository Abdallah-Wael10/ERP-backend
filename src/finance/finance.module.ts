import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Order, OrderSchema } from '../orders/order.schema';
import { User, UserSchema } from '../users/users.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Customer, CustomerSchema } from '../customers/customers.schema';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { Leave, LeaveSchema } from '../leaves/leave.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
