import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CardType,
  PaymentMethod,
  Prisma,
  RevenueSource,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDateRange,
  DateFilterDto,
} from '../common/dto/date-filter.dto';
import { resolvePagination } from '../common/dto/pagination.dto';
import { CardFeeSettings } from '../common/types/card-fee.settings';
import { calculateRevenueFees } from '../common/utils/card-fee.util';
import { toNumber } from '../common/utils/financial.util';
import { FeesService } from '../fees/fees.service';
import {
  CreateRevenueDto,
  RevenueFilterDto,
  UpdateRevenueDto,
} from './dto/revenue.dto';
import { ImportRevenueDto } from './dto/import-revenue.dto';
import {
  buildRevenueImportTemplate,
  parseRevenueImportFile,
} from './revenue-import.parser';

const revenueInclude = {
  laundry: { select: { id: true, name: true, settings: true } },
};

@Injectable()
export class RevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesService: FeesService,
  ) {}

  async create(dto: CreateRevenueDto) {
    await this.getLaundryOrThrow(dto.laundryId);
    const fees = await this.feesService.getForLaundry(dto.laundryId);
    const data = this.buildRevenueData(fees, dto);

    return this.formatRevenue(
      await this.prisma.revenue.create({
        data: {
          ...data,
          date: new Date(dto.date),
          laundryId: dto.laundryId,
        },
        include: revenueInclude,
      }),
    );
  }

  async findAll(filters: DateFilterDto & RevenueFilterDto) {
    const { page, limit, skip } = resolvePagination(filters);
    const dateRange = buildDateRange(filters.startDate, filters.endDate);

    const where = {
      ...(filters.laundryId && { laundryId: filters.laundryId }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.source && { source: filters.source }),
      ...(dateRange && { date: dateRange }),
    };

    const [data, total] = await Promise.all([
      this.prisma.revenue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: revenueInclude,
      }),
      this.prisma.revenue.count({ where }),
    ]);

    return {
      data: data.map((item) => this.formatRevenue(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const revenue = await this.prisma.revenue.findUnique({
      where: { id },
      include: revenueInclude,
    });

    if (!revenue) {
      throw new NotFoundException('Receita não encontrada');
    }

    return this.formatRevenue(revenue);
  }

  async update(id: string, dto: UpdateRevenueDto) {
    const current = await this.prisma.revenue.findUnique({
      where: { id },
      include: revenueInclude,
    });

    if (!current) {
      throw new NotFoundException('Receita não encontrada');
    }

    const laundryId = dto.laundryId ?? current.laundryId;
    await this.getLaundryOrThrow(laundryId);
    const fees = await this.feesService.getForLaundry(laundryId);

    const merged = {
      date: dto.date ?? current.date.toISOString().slice(0, 10),
      amount: dto.amount ?? toNumber(current.amount),
      paymentMethod: dto.paymentMethod ?? current.paymentMethod,
      cardType: dto.cardType ?? current.cardType,
      installments: dto.installments ?? current.installments ?? 1,
      source: dto.source ?? current.source,
      category: dto.category !== undefined ? dto.category : current.category,
      note: dto.note !== undefined ? dto.note : current.note,
    };

    const data = this.buildRevenueData(fees, merged);

    return this.formatRevenue(
      await this.prisma.revenue.update({
        where: { id },
        data: {
          ...data,
          ...(dto.laundryId && { laundryId: dto.laundryId }),
        },
        include: revenueInclude,
      }),
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.revenue.delete({ where: { id } });
    return { deleted: true };
  }

  generateImportTemplate() {
    return buildRevenueImportTemplate();
  }

  async importFromFile(file: Express.Multer.File, dto: ImportRevenueDto) {
    await this.getLaundryOrThrow(dto.laundryId);
    const fees = await this.feesService.getForLaundry(dto.laundryId);

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const extension = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'Formato inválido. Envie um arquivo Excel (.xlsx, .xls) ou CSV.',
      );
    }

    const parsed = parseRevenueImportFile(file.buffer);

    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        parsed.errors[0]?.message ??
          'Nenhuma venda válida encontrada na planilha',
      );
    }

    const uniqueDates = [...new Set(parsed.rows.map((row) => row.date))];

    const result = await this.prisma.$transaction(async (tx) => {
      let replaced = 0;

      if (dto.replaceExisting) {
        for (const date of uniqueDates) {
          const range = buildDateRange(date, date);
          const deleted = await tx.revenue.deleteMany({
            where: {
              laundryId: dto.laundryId,
              source: {
                in: [RevenueSource.MAXPAN, RevenueSource.DAILY_SALES],
              },
              ...(range && { date: range }),
            },
          });
          replaced += deleted.count;
        }
      }

      let created = 0;
      let skipped = 0;
      let totalAmount = 0;
      let totalNetAmount = 0;

      for (const row of parsed.rows) {
        if (!dto.replaceExisting) {
          const range = buildDateRange(row.date, row.date);
          const existing = await tx.revenue.findFirst({
            where: {
              laundryId: dto.laundryId,
              paymentMethod: row.paymentMethod,
              source: row.source,
              amount: new Prisma.Decimal(row.amount),
              ...(range && { date: range }),
            },
          });

          if (existing) {
            skipped += 1;
            continue;
          }
        }

        const data = this.buildRevenueData(fees, row);

        await tx.revenue.create({
          data: {
            ...data,
            date: new Date(row.date),
            laundryId: dto.laundryId,
          },
        });

        created += 1;
        totalAmount += row.amount;
        totalNetAmount += toNumber(data.netAmount ?? data.amount);
      }

      return { created, skipped, replaced, totalAmount, totalNetAmount };
    });

    return {
      format: parsed.format,
      created: result.created,
      skipped: result.skipped,
      replaced: result.replaced,
      totalAmount: Number(result.totalAmount.toFixed(2)),
      totalNetAmount: Number(result.totalNetAmount.toFixed(2)),
      dates: uniqueDates,
      errors: parsed.errors,
    };
  }

  private buildRevenueData(
    fees: CardFeeSettings,
    dto: {
      amount: number;
      paymentMethod: PaymentMethod;
      cardType?: CardType | null;
      installments?: number | null;
      source: RevenueSource;
      category?: string | null;
      note?: string | null;
      date?: string;
    },
  ) {
    const computed = calculateRevenueFees(
      dto.amount,
      dto.paymentMethod,
      fees,
      dto.cardType,
      dto.installments ?? 1,
    );

    return {
      amount: new Prisma.Decimal(dto.amount),
      netAmount: new Prisma.Decimal(computed.netAmount),
      feeRate:
        computed.feeRate > 0
          ? new Prisma.Decimal(computed.feeRate)
          : null,
      feeAmount:
        computed.feeAmount > 0
          ? new Prisma.Decimal(computed.feeAmount)
          : null,
      paymentMethod: dto.paymentMethod,
      cardType: computed.cardType,
      installments: computed.installments,
      source: dto.source,
      category: dto.category ?? undefined,
      note: dto.note ?? undefined,
    };
  }

  private formatRevenue<
    T extends {
      amount: Prisma.Decimal;
      netAmount: Prisma.Decimal | null;
      feeRate: Prisma.Decimal | null;
      feeAmount: Prisma.Decimal | null;
      paymentMethod: PaymentMethod;
    },
  >(revenue: T) {
    const gross = toNumber(revenue.amount);
    const net = revenue.netAmount
      ? toNumber(revenue.netAmount)
      : gross;
    const feeAmount = revenue.feeAmount
      ? toNumber(revenue.feeAmount)
      : Number((gross - net).toFixed(2));
    const feeRate = revenue.feeRate ? toNumber(revenue.feeRate) : 0;

    return {
      ...revenue,
      grossAmount: gross,
      netAmount: net,
      feeAmount,
      feeRate,
    };
  }

  private async getLaundryOrThrow(laundryId: string) {
    const laundry = await this.prisma.laundry.findUnique({
      where: { id: laundryId },
    });

    if (!laundry) {
      throw new NotFoundException('Lavanderia não encontrada');
    }

    return laundry;
  }
}
