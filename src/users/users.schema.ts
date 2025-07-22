import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  salary: number;

  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
  status: string;

  @Prop({ type: String, enum: Role, required: true })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);
