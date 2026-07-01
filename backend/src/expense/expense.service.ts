import { Injectable, NotFoundException } from '@nestjs/common';
import { PayableStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDateRange,
  DateFilterDto,
} from '../common/dto/date-filter.dto';
import { resolvePagination } from '../common/dto/pagination.dto';
import {
  CreateExpenseDto,
  ExpenseFilterDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

const expenseInclude = {
  category: { select: { id: true, name: true, slug: true } },
  laundry: { select: { id: true, name: true } },
  machine: { select: { id: true, name: true, type: true } },
};

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto) {
    await this.ensureLaundryExists(dto.laundryId);
    await this.ensureCategoryExists(dto.categoryId);

    if (dto.machineId) {
      await this.ensureMachineExists(dto.machineId);
    }

    return this.prisma.expense.create({
      data: {
        date: new Date(dto.date),
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        type: dto.type,
        paid: dto.paid ?? false,
        paymentMethod: dto.paymentMethod,
        note: dto.note,
        categoryId: dto.categoryId,
        laundryId: dto.laundryId,
        machineId: dto.machineId,
      },
      include: expenseInclude,
    });
  }

  async findAll(filters: DateFilterDto & ExpenseFilterDto) {
    const { page, limit, skip } = resolvePagination(filters);
    const dateRange = buildDateRange(filters.startDate, filters.endDate);

    const where = {
      ...(filters.laundryId && { laundryId: filters.laundryId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.paid !== undefined && { paid: filters.paid }),
      ...(dateRange && { date: dateRange }),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: expenseInclude,
      }),
      this.prisma.expense.count({ where }),
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
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: expenseInclude,
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);

    if (dto.laundryId) {
      await this.ensureLaundryExists(dto.laundryId);
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    if (dto.machineId) {
      await this.ensureMachineExists(dto.machineId);
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.description && { description: dto.description }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.type && { type: dto.type }),
        ...(dto.paid !== undefined && { paid: dto.paid }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.laundryId && { laundryId: dto.laundryId }),
        ...(dto.machineId !== undefined && { machineId: dto.machineId }),
      },
      include: expenseInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const linkedPayable = await this.prisma.payable.findUnique({
      where: { expenseId: id },
    });

    await this.prisma.$transaction(async (tx) => {
      if (linkedPayable) {
        await tx.payable.update({
          where: { id: linkedPayable.id },
          data: {
            status: PayableStatus.PENDING,
            paidAt: null,
            expenseId: null,
          },
        });
      }

      await tx.expense.delete({ where: { id } });
    });

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

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  private async ensureMachineExists(machineId: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      throw new NotFoundException('Máquina não encontrada');
    }
  }
}
