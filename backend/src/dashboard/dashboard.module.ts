import { Module } from '@nestjs/common';
import { PayablesModule } from '../payables/payables.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PayablesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
