import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { ReportFilterDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-result')
  getMonthlyResult(@Query() filters: ReportFilterDto) {
    return this.reportsService.getMonthlyResult(filters);
  }

  @Get('expenses-by-category')
  getExpensesByCategory(@Query() filters: ReportFilterDto) {
    return this.reportsService.getExpensesByCategory(filters);
  }

  @Get('revenue-by-payment-method')
  getRevenueByPaymentMethod(@Query() filters: ReportFilterDto) {
    return this.reportsService.getRevenueByPaymentMethod(filters);
  }

  @Get('profit-by-period')
  getProfitByPeriod(@Query() filters: ReportFilterDto) {
    return this.reportsService.getProfitByPeriod(filters);
  }

  @Get('cash-flow')
  getCashFlow(@Query() filters: ReportFilterDto) {
    return this.reportsService.getCashFlow(filters);
  }

  @Get('machine-maintenance')
  getMachineMaintenance(@Query('laundryId') laundryId?: string) {
    return this.reportsService.getMachineMaintenanceReport(laundryId);
  }
}
