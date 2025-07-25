import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(
    createUserDto: CreateUserDto,
    currentUserRole: string,
  ): Promise<User> {
    // Only superadmin and hr can create users
    if (!['superadmin', 'hr'].includes(currentUserRole)) {
      throw new ForbiddenException('Only SuperAdmin and HR can create users');
    }

    const exists = await this.userModel.findOne({ email: createUserDto.email });
    if (exists) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return user;
  }

  async findAll(currentUserRole: string): Promise<User[]> {
    // Only superadmin and hr can view all users
    if (!['superadmin', 'hr'].includes(currentUserRole)) {
      throw new ForbiddenException('Only SuperAdmin and HR can view all users');
    }

    return this.userModel.find().select('-password').exec();
  }

  async findOne(id: string, currentUserRole: string): Promise<User> {
    // Only superadmin and hr can view user details
    if (!['superadmin', 'hr'].includes(currentUserRole)) {
      throw new ForbiddenException(
        'Only SuperAdmin and HR can view user details',
      );
    }

    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserRole: string,
  ): Promise<User> {
    // Only superadmin can update users, hr can update non-superadmin users
    if (currentUserRole === 'hr') {
      const targetUser = await this.userModel.findById(id);
      if (targetUser?.role === 'superadmin') {
        throw new ForbiddenException('HR cannot update SuperAdmin users');
      }
    } else if (currentUserRole !== 'superadmin') {
      throw new ForbiddenException('Only SuperAdmin and HR can update users');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(
    id: string,
    currentUserRole: string,
  ): Promise<{ message: string }> {
    // Only superadmin can delete users, hr can delete non-superadmin users
    if (currentUserRole === 'hr') {
      const targetUser = await this.userModel.findById(id);
      if (targetUser?.role === 'superadmin') {
        throw new ForbiddenException('HR cannot delete SuperAdmin users');
      }
    } else if (currentUserRole !== 'superadmin') {
      throw new ForbiddenException('Only SuperAdmin and HR can delete users');
    }

    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deleted successfully' };
  }
}
