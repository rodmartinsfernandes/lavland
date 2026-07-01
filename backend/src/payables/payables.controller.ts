import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  CreatePayableDto,
  CreateRecurringPayableDto,
  MarkPayablePaidDto,
  PayableFilterDto,
  UpdatePayableDto,
} from './dto/payable.dto';
import { PayablesService } from './payables.service';

@Controller('payables')
@UseGuards(AuthGuard('jwt'))
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Post()
  create(@Body() dto: CreatePayableDto) {
    return this.payablesService.create(dto);
  }

  @Post('recurring')
  createRecurring(@Body() dto: CreateRecurringPayableDto) {
    return this.payablesService.createRecurring(dto);
  }

  @Get()
  findAll(@Query() filters: PayableFilterDto) {
    return this.payablesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payablesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayableDto) {
    return this.payablesService.update(id, dto);
  }

  @Patch(':id/pay')
  markAsPaid(@Param('id') id: string, @Body() dto: MarkPayablePaidDto) {
    return this.payablesService.markAsPaid(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.payablesService.remove(id);
  }
}
