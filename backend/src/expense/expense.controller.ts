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
import { DateFilterDto } from '../common/dto/date-filter.dto';
import {
  CreateExpenseDto,
  ExpenseFilterDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpenseService } from './expense.service';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expenseService.create(dto);
  }

  @Get()
  findAll(@Query() filters: DateFilterDto & ExpenseFilterDto) {
    return this.expenseService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseService.remove(id);
  }
}
