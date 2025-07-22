import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/users.schema';
import { MailService } from '../mail/mail.service';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from './password-reset.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordReset>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      ...dto,
      password: hash,
    });

    return {
      message: 'User registered successfully',
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account is suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    const token = this.jwtService.sign(payload);

    await this.mailService.sendLoginMail(user.email, user.fullName);

    return {
      access_token: token,
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        salary: user.salary,
        phone: user.phone,
      },
    };
  }

  async forgetPassword(dto: ForgetPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) return { message: 'If this email exists, a code will be sent.' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.passwordResetModel.create({ email: dto.email, code, expiresAt });
    await this.mailService.sendResetPasswordMail(dto.email, code);

    return { message: 'If this email exists, a code will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.passwordResetModel.findOne({
      email: dto.email,
      code: dto.code,
      expiresAt: { $gt: new Date() },
    });
    if (!reset) throw new UnauthorizedException('Invalid or expired code');

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.updateOne({ email: dto.email }, { password: hash });
    await this.passwordResetModel.deleteOne({
      email: dto.email,
      code: dto.code,
    });

    return { message: 'Password reset successfully' };
  }
}
