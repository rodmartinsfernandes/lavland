import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DateFilterDto } from '../common/dto/date-filter.dto';
import { ImportRevenueDto } from './dto/import-revenue.dto';
import {
  CreateRevenueDto,
  RevenueFilterDto,
  UpdateRevenueDto,
} from './dto/revenue.dto';
import { RevenueService } from './revenue.service';

@Controller('revenues')
@UseGuards(AuthGuard('jwt'))
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  create(@Body() dto: CreateRevenueDto) {
    return this.revenueService.create(dto);
  }

  @Get('import/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.revenueService.generateImportTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="exemplo-lista-vendas-stone.xlsx"',
    });
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportRevenueDto,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    return this.revenueService.importFromFile(file, dto);
  }

  @Get()
  findAll(@Query() filters: DateFilterDto & RevenueFilterDto) {
    return this.revenueService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.revenueService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRevenueDto) {
    return this.revenueService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.revenueService.remove(id);
  }
}
