import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { FeeFilterDto, UpsertFeesDto } from './dto/fees.dto';
import { FeesService } from './fees.service';

@Controller('fees')
@UseGuards(AuthGuard('jwt'))
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get()
  findOne(@Query() filters: FeeFilterDto) {
    return this.feesService.getConfig(filters.laundryId);
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  upsert(@Body() dto: UpsertFeesDto) {
    return this.feesService.upsert(dto);
  }
}
