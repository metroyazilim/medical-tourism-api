import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({ imports: [PlatformModule], controllers: [AppointmentController], providers: [AppointmentService], exports: [AppointmentService] })
export class AppointmentModule {}
