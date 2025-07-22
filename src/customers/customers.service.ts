import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './customers.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    userId: string,
    userRole: string,
  ): Promise<Customer> {
    // Only sales, salesManager, superadmin can create customers
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can create customers');
    }

    // Check if email already exists
    const existingCustomer = await this.customerModel.findOne({
      email: createCustomerDto.email,
    });
    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    const customer = new this.customerModel({
      ...createCustomerDto,
      userId,
    });

    return customer.save();
  }

  async findAll(userRole: string, userId?: string): Promise<Customer[]> {
    // Only sales, salesManager, superadmin can view customers
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can view customers');
    }

    let query = {};

    // Sales can only see their own customers
    if (userRole === 'sales') {
      query = { userId };
    }
    // salesManager and superadmin can see all customers

    return this.customerModel
      .find(query)
      .populate('userId', 'fullName email role')
      .exec();
  }

  async findOne(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<Customer> {
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can view customers');
    }

    const customer = await this.customerModel
      .findById(id)
      .populate('userId', 'fullName email role')
      .exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Sales can only see their own customers
    if (userRole === 'sales' && customer.userId.toString() !== userId) {
      throw new ForbiddenException('You can only view your own customers');
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    userRole: string,
    userId?: string,
  ): Promise<Customer> {
    if (!['sales', 'salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only sales team can update customers');
    }

    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Sales can only update their own customers
    if (userRole === 'sales' && customer.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own customers');
    }

    // Check email uniqueness if email is being updated
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingCustomer = await this.customerModel.findOne({
        email: updateCustomerDto.email,
        _id: { $ne: id },
      });
      if (existingCustomer) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, updateCustomerDto, { new: true })
      .populate('userId', 'fullName email role')
      .exec();

    if (!updatedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    return updatedCustomer;
  }

  async remove(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<{ message: string }> {
    if (!['salesManager', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only sales managers and superadmin can delete customers',
      );
    }

    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.customerModel.findByIdAndDelete(id);
    return { message: 'Customer deleted successfully' };
  }
}
