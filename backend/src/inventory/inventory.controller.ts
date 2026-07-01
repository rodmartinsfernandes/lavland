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
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CreateInventoryMovementDto,
  CreateInventoryProductDto,
  InventoryFilterDto,
  UpdateInventoryProductDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  createProduct(@Body() dto: CreateInventoryProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  findAllProducts(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.findAllProducts(filters);
  }

  @Get('products/:id')
  findProduct(@Param('id') id: string) {
    return this.inventoryService.findProduct(id);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateInventoryProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Post('products/:id/movements')
  addMovement(
    @Param('id') id: string,
    @Body() dto: CreateInventoryMovementDto,
  ) {
    return this.inventoryService.addMovement(id, dto);
  }

  @Get('products/:id/movements')
  getMovements(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.inventoryService.getMovements(id, pagination);
  }

  @Get('reports/consumption')
  getConsumptionReport(@Query('laundryId') laundryId?: string) {
    return this.inventoryService.getConsumptionReport(laundryId);
  }
}
