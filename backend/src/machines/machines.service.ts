import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination } from '../common/dto/pagination.dto';
import { toNumber } from '../common/utils/financial.util';
import {
  CreateMachineDto,
  MachineFilterDto,
  UpdateMachineDto,
} from './dto/machine.dto';

const machineInclude = {
  laundry: { select: { id: true, name: true } },
};

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMachineDto) {
    await this.ensureLaundryExists(dto.laundryId);

    return this.prisma.machine.create({
      data: {
        name: dto.name,
        type: dto.type,
        capacity: dto.capacity,
        brandModel: dto.brandModel,
        acquiredAt: dto.acquiredAt ? new Date(dto.acquiredAt) : undefined,
        status: dto.status,
        laundryId: dto.laundryId,
      },
      include: machineInclude,
    });
  }

  async findAll(filters: MachineFilterDto) {
    const { page, limit, skip } = resolvePagination(filters);

    const where = {
      ...(filters.laundryId && { laundryId: filters.laundryId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: machineInclude,
      }),
      this.prisma.machine.count({ where }),
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
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: machineInclude,
    });

    if (!machine) {
      throw new NotFoundException('Máquina não encontrada');
    }

    return machine;
  }

  async getMaintenanceCost(id: string) {
    const machine = await this.findOne(id);

    const expenses = await this.prisma.expense.findMany({
      where: { machineId: id },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce(
      (sum, expense) => sum + toNumber(expense.amount),
      0,
    );

    return {
      machine,
      totalMaintenanceCost: total,
      expenses,
    };
  }

  async update(id: string, dto: UpdateMachineDto) {
    await this.findOne(id);

    if (dto.laundryId) {
      await this.ensureLaundryExists(dto.laundryId);
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.brandModel !== undefined && { brandModel: dto.brandModel }),
        ...(dto.acquiredAt !== undefined && {
          acquiredAt: dto.acquiredAt ? new Date(dto.acquiredAt) : null,
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.laundryId && { laundryId: dto.laundryId }),
      },
      include: machineInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.machine.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureLaundryExists(laundryId: string) {
    const laundry = await this.prisma.laundry.findUnique({
      where: { id: laundryId },
    });

    if (!laundry) {
      throw new NotFoundException('Lavanderia não encontrada');
    }
  }
}
