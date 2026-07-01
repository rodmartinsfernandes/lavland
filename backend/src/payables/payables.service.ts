import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseType,
  PayableStatus,
  Prisma,
} from '../generated/prisma/client';
import { RecurrenceInterval } from '../common/enums/financial.enum';
import { addMonths } from '../common/utils/financial.util';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination } from '../common/dto/pagination.dto';
import { buildDateRange } from '../common/dto/date-filter.dto';
import {
  CreatePayableDto,
  CreateRecurringPayableDto,
  MarkPayablePaidDto,
  PayableFilterDto,
  UpdatePayableDto,
} from './dto/payable.dto';

const payableInclude = {
  category: { select: { id: true, name: true, slug: true } },
  laundry: { select: { id: true, name: true } },
};

@Injectable()
export class PayablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePayableDto) {
    await this.ensureLaundryExists(dto.laundryId);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    return this.formatPayable(
      await this.prisma.payable.create({
        data: {
          description: dto.description,
          amount: new Prisma.Decimal(dto.amount),
          dueDate: new Date(dto.dueDate),
          note: dto.note,
          categoryId: dto.categoryId,
          laundryId: dto.laundryId,
        },
        include: payableInclude,
      }),
    );
  }

  async createRecurring(dto: CreateRecurringPayableDto) {
    await this.ensureLaundryExists(dto.laundryId);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const interval = dto.interval ?? RecurrenceInterval.MONTHLY;
    if (interval !== RecurrenceInterval.MONTHLY) {
      throw new BadRequestException('Intervalo de recorrência não suportado');
    }

    const firstDueDate = new Date(dto.firstDueDate);
    const payables = Array.from({ length: dto.installments }, (_, index) => {
      const dueDate = index === 0 ? firstDueDate : addMonths(firstDueDate, index);
      const installmentLabel =
        dto.installments > 1
          ? ` - parcela ${index + 1}/${dto.installments}`
          : '';

      return {
        description: `${dto.description}${installmentLabel}`,
        amount: new Prisma.Decimal(dto.amount),
        dueDate,
        note: dto.note,
        categoryId: dto.categoryId,
        laundryId: dto.laundryId,
      };
    });

    const created = await this.prisma.$transaction(
      payables.map((data) =>
        this.prisma.payable.create({
          data,
          include: payableInclude,
        }),
      ),
    );

    return {
      created: created.length,
      totalAmount: dto.amount * dto.installments,
      data: created.map((item) => this.formatPayable(item)),
    };
  }

  async findAll(filters: PayableFilterDto) {
    await this.syncOverdueStatus(filters.laundryId);

    const { page, limit, skip } = resolvePagination(filters);
    const dateRange = buildDateRange(filters.startDate, filters.endDate);

    const where = {
      ...(filters.laundryId && { laundryId: filters.laundryId }),
      ...(filters.status && { status: filters.status }),
      ...(dateRange && { dueDate: dateRange }),
    };

    const [data, total] = await Promise.all([
      this.prisma.payable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: payableInclude,
      }),
      this.prisma.payable.count({ where }),
    ]);

    return {
      data: data.map((item) => this.formatPayable(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const payable = await this.prisma.payable.findUnique({
      where: { id },
      include: payableInclude,
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    return this.formatPayable(payable);
  }

  async update(id: string, dto: UpdatePayableDto) {
    const current = await this.findOne(id);

    if (current.status === PayableStatus.PAID) {
      throw new BadRequestException('Conta já paga não pode ser editada');
    }

    if (dto.laundryId) {
      await this.ensureLaundryExists(dto.laundryId);
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const updated = await this.prisma.payable.update({
      where: { id },
      data: {
        ...(dto.description && { description: dto.description }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.laundryId && { laundryId: dto.laundryId }),
      },
      include: payableInclude,
    });

    return this.formatPayable(updated);
  }

  async markAsPaid(id: string, dto: MarkPayablePaidDto = {}) {
    const payable = await this.prisma.payable.findUnique({
      where: { id },
      include: payableInclude,
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (payable.status === PayableStatus.PAID || payable.expenseId) {
      throw new BadRequestException('Conta já está paga');
    }

    const categoryId =
      payable.categoryId ?? (await this.resolveDefaultCategoryId());
    const paidAt = dto.paidDate ? new Date(dto.paidDate) : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          date: paidAt,
          description: payable.description,
          amount: payable.amount,
          type: ExpenseType.FIXED,
          paid: true,
          paymentMethod: dto.paymentMethod,
          note: payable.note
            ? `${payable.note} (baixa de conta a pagar)`
            : 'Baixa de conta a pagar',
          categoryId,
          laundryId: payable.laundryId,
        },
      });

      return tx.payable.update({
        where: { id },
        data: {
          status: PayableStatus.PAID,
          paidAt,
          expenseId: expense.id,
        },
        include: payableInclude,
      });
    });

    return this.formatPayable(updated);
  }

  async remove(id: string) {
    const payable = await this.findOne(id);

    if (payable.status === PayableStatus.PAID) {
      throw new BadRequestException(
        'Conta paga não pode ser excluída. Exclua a despesa vinculada em Despesas, se necessário.',
      );
    }

    await this.prisma.payable.delete({ where: { id } });
    return { deleted: true };
  }

  async syncOverdueStatus(laundryId?: string) {
    await this.prisma.payable.updateMany({
      where: {
        status: PayableStatus.PENDING,
        dueDate: { lt: this.startOfToday() },
        ...(laundryId && { laundryId }),
      },
      data: { status: PayableStatus.OVERDUE },
    });
  }

  private formatPayable<T extends { status: PayableStatus; dueDate: Date }>(
    payable: T,
  ) {
    const isOverdue =
      payable.status === PayableStatus.PENDING &&
      payable.dueDate < this.startOfToday();

    return {
      ...payable,
      status: isOverdue ? PayableStatus.OVERDUE : payable.status,
      isOverdue,
    };
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
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

  private async resolveDefaultCategoryId() {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { slug: 'outros' },
    });

    if (!category) {
      throw new BadRequestException(
        'Conta sem categoria. Selecione uma categoria ou cadastre "Outros".',
      );
    }

    return category.id;
  }
}
