import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel('Product') private productModel: Model<any>,
    @InjectModel('Customer') private customerModel: Model<any>,
    private mailService: MailService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
    userRole: string,
  ): Promise<Order> {
    // Only sales, salesManager, superadmin can create orders
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can create orders');
    }

    // Check if customer exists
    const customer = await this.customerModel.findById(
      createOrderDto.customerId,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if all products exist and have sufficient quantity
    for (const line of createOrderDto.lines) {
      const product = await this.productModel.findById(line.productId);
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${line.productId} not found`,
        );
      }
      if (product.qty < line.qty) {
        throw new BadRequestException(
          `Insufficient quantity for product ${product.title}`,
        );
      }
    }

    const order = new this.orderModel({
      ...createOrderDto,
      createdBy: userId,
      status: 'pending',
    });

    const savedOrder = await order.save();

    // Populate order for email
    const populatedOrder = await this.orderModel
      .findById(savedOrder._id)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    // Send email notification
    await this.mailService.sendOrderCreatedEmail(populatedOrder!);

    return populatedOrder!;
  }

  async findAll(userRole: string, userId?: string): Promise<Order[]> {
    if (
      !['sales', 'salesManager', 'superadmin', 'inventory'].includes(userRole)
    ) {
      throw new ForbiddenException('Access denied');
    }

    let query = {};

    // Sales can only see their own orders
    if (userRole === 'sales') {
      query = { createdBy: userId };
    }
    // salesManager, superadmin, inventory can see all orders

    return this.orderModel
      .find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .populate('shippedBy', 'fullName email role')
      .populate('cancelledBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();
  }

  async findOne(id: string, userRole: string, userId?: string): Promise<Order> {
    if (
      !['sales', 'salesManager', 'superadmin', 'inventory'].includes(userRole)
    ) {
      throw new ForbiddenException('Access denied');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .populate('shippedBy', 'fullName email role')
      .populate('cancelledBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Sales can only see their own orders
    if (userRole === 'sales' && order.createdBy._id.toString() !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userRole: string,
    userId?: string,
  ): Promise<Order> {
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can update orders');
    }

    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Sales can only update their own orders and only if status is pending
    if (userRole === 'sales') {
      if (order.createdBy.toString() !== userId) {
        throw new ForbiddenException('You can only update your own orders');
      }
      if (order.status !== 'pending') {
        throw new ForbiddenException('You can only update pending orders');
      }
    }

    // Check if customer exists (if being updated)
    if (updateOrderDto.customerId) {
      const customer = await this.customerModel.findById(
        updateOrderDto.customerId,
      );
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Check products and quantities (if being updated)
    if (updateOrderDto.lines) {
      for (const line of updateOrderDto.lines) {
        const product = await this.productModel.findById(line.productId);
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${line.productId} not found`,
          );
        }
        if (product.qty < line.qty) {
          throw new BadRequestException(
            `Insufficient quantity for product ${product.title}`,
          );
        }
      }
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    return updatedOrder;
  }

  async confirmOrder(
    id: string,
    userRole: string,
    userId: string,
  ): Promise<Order> {
    if (!['salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only sales managers and superadmin can confirm orders',
      );
    }

    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be confirmed');
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: 'confirmed',
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
        { new: true },
      )
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    // Send email notification
    await this.mailService.sendOrderConfirmedEmail(updatedOrder);

    return updatedOrder;
  }

  async shipOrder(
    id: string,
    userRole: string,
    userId: string,
  ): Promise<Order> {
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can ship orders',
      );
    }

    const order = await this.orderModel
      .findById(id)
      .populate('lines.productId')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed orders can be shipped');
    }

    // Reduce product quantities
    for (const line of order.lines) {
      const product = await this.productModel.findById(line.productId);
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${line.productId} not found`,
        );
      }
      if (product.qty < line.qty) {
        throw new BadRequestException(
          `Insufficient quantity for product ${product.title}`,
        );
      }

      await this.productModel.findByIdAndUpdate(line.productId, {
        $inc: { qty: -line.qty },
      });
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: 'shipped',
          shippedBy: userId,
          shippedAt: new Date(),
        },
        { new: true },
      )
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .populate('shippedBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    // Send email notification
    await this.mailService.sendOrderShippedEmail(updatedOrder);

    return updatedOrder;
  }

  async cancelOrder(
    id: string,
    userRole: string,
    userId: string,
  ): Promise<Order> {
    if (!['salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only sales managers and superadmin can cancel orders',
      );
    }

    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException(
        'Only pending or confirmed orders can be cancelled',
      );
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          cancelledBy: userId,
          cancelledAt: new Date(),
        },
        { new: true },
      )
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .populate('cancelledBy', 'fullName email role')
      .populate('lines.productId', 'title price category')
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    // Send email notification
    await this.mailService.sendOrderCancelledEmail(updatedOrder);

    return updatedOrder;
  }

  async remove(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<{ message: string }> {
    if (!['superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only superadmin can delete orders');
    }

    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.orderModel.findByIdAndDelete(id);
    return { message: 'Order deleted successfully' };
  }
}
 