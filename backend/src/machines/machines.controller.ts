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
  CreateMachineDto,
  MachineFilterDto,
  UpdateMachineDto,
} from './dto/machine.dto';
import { MachinesService } from './machines.service';

@Controller('machines')
@UseGuards(AuthGuard('jwt'))
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Get()
  findAll(@Query() filters: MachineFilterDto) {
    return this.machinesService.findAll(filters);
  }

  @Get(':id/maintenance-cost')
  getMaintenanceCost(@Param('id') id: string) {
    return this.machinesService.getMaintenanceCost(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.machinesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMachineDto) {
    return this.machinesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.machinesService.remove(id);
  }
}
