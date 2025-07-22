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
  Patch,
} from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('/api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(
      createOrderDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  findAll(@Request() req) {
    return this.ordersService.findAll(req.user.role, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.role, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req,
  ) {
    return this.ordersService.update(
      id,
      updateOrderDto,
      req.user.role,
      req.user.id,
    );
  }

  @Patch(':id/confirm')
  confirmOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmOrder(id, req.user.role, req.user.id);
  }

  @Patch(':id/ship')
  shipOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.shipOrder(id, req.user.role, req.user.id);
  }

  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelOrder(id, req.user.role, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.ordersService.remove(id, req.user.role, req.user.id);
  }
}
