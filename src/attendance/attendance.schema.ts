import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  checkInTime: Date;

  @Prop()
  checkOutTime?: Date;

  @Prop({ required: true })
  date: string; // Format: YYYY-MM-DD

  @Prop({ type: Types.ObjectId, ref: 'User' })
  editedBy?: Types.ObjectId;

  @Prop()
  editedAt?: Date;

  @Prop()
  note?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Create compound index to ensure one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
