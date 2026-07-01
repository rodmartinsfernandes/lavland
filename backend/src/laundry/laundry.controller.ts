import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateLaundryDto, UpdateLaundryDto } from './dto/laundry.dto';
import { LaundryService } from './laundry.service';

@Controller('laundries')
@UseGuards(AuthGuard('jwt'))
export class LaundryController {
  constructor(private readonly laundryService: LaundryService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.laundryService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.laundryService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateLaundryDto) {
    return this.laundryService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateLaundryDto) {
    return this.laundryService.update(id, dto);
  }
}
