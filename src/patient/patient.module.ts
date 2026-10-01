import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

@Module({ imports: [PlatformModule], controllers: [PatientController], providers: [PatientService] })
export class PatientModule {}
