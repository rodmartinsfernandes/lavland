import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ExpenseModule } from './expense/expense.module';
import { InventoryModule } from './inventory/inventory.module';
import { FeesModule } from './fees/fees.module';
import { LaundryModule } from './laundry/laundry.module';
import { MachinesModule } from './machines/machines.module';
import { PayablesModule } from './payables/payables.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { RevenueModule } from './revenue/revenue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ExpenseCategoriesModule,
    LaundryModule,
    FeesModule,
    RevenueModule,
    ExpenseModule,
    PayablesModule,
    MachinesModule,
    InventoryModule,
    DashboardModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
