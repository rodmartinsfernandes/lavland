import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, resolvePagination } from '../common/dto/pagination.dto';
import { CreateLaundryDto, UpdateLaundryDto } from './dto/laundry.dto';

@Injectable()
export class LaundryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLaundryDto) {
    return this.prisma.$transaction(async (tx) => {
      const laundry = await tx.laundry.create({
        data: {
          name: dto.name,
          address: dto.address,
          cnpj: dto.cnpj,
          settings: dto.settings as Prisma.InputJsonValue | undefined,
        },
      });

      await tx.laundryFeeConfig.create({
        data: { laundryId: laundry.id },
      });

      return laundry;
    });
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit, skip } = resolvePagination(pagination);

    const [data, total] = await Promise.all([
      this.prisma.laundry.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.laundry.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const laundry = await this.prisma.laundry.findUnique({ where: { id } });

    if (!laundry) {
      throw new NotFoundException('Lavanderia não encontrada');
    }

    return laundry;
  }

  async update(id: string, dto: UpdateLaundryDto) {
    await this.findOne(id);
    return this.prisma.laundry.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.cnpj !== undefined && { cnpj: dto.cnpj }),
        ...(dto.settings !== undefined && {
          settings: dto.settings as Prisma.InputJsonValue,
        }),
      },
    });
  }
}
