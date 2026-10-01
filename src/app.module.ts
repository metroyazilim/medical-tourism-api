import { Module } from '@nestjs/common';
import { MessagingModule } from './messaging/messaging.module';
import { PlatformModule } from './platform/platform.module';
import { IdentityModule } from './identity/identity.module';
import { PatientModule } from './patient/patient.module';
import { DirectoryModule } from './directory/directory.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { FilesModule } from './files/files.module';
import { QuoteModule } from './quote/quote.module';
import { AppointmentModule } from './appointment/appointment.module';
import { NotificationModule } from './notification/notification.module';
import { PrivacyModule } from './privacy/privacy.module';

@Module({ imports: [PlatformModule, IdentityModule, PatientModule, DirectoryModule, DiscoveryModule, MessagingModule, InquiryModule, FilesModule, QuoteModule, AppointmentModule, NotificationModule, PrivacyModule] })
export class AppModule {}
