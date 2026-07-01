import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapFeeConfigToSettings,
  parseCardFeeSettings,
} from '../common/types/card-fee.settings';
import { UpsertFeesDto } from './dto/fees.dto';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForLaundry(laundryId: string) {
    await this.ensureLaundryExists(laundryId);

    const config = await this.prisma.laundryFeeConfig.findUnique({
      where: { laundryId },
    });

    if (config) {
      return mapFeeConfigToSettings(config);
    }

    const laundry = await this.prisma.laundry.findUnique({
      where: { id: laundryId },
      select: { settings: true },
    });

    return parseCardFeeSettings(laundry?.settings);
  }

  async getConfig(laundryId: string) {
    const settings = await this.getForLaundry(laundryId);
    return {
      laundryId,
      debitRate: settings.debit,
      credit1xRate: settings.credit1x,
      creditInstallmentsRate: settings.creditInstallments,
      pixRate: settings.pix,
      cashRate: settings.cash,
      anticipationRate: settings.anticipation,
      applyAnticipation: settings.applyAnticipation,
    };
  }

  async upsert(dto: UpsertFeesDto) {
    await this.ensureLaundryExists(dto.laundryId);

    const config = await this.prisma.laundryFeeConfig.upsert({
      where: { laundryId: dto.laundryId },
      create: {
        laundryId: dto.laundryId,
        debitRate: new Prisma.Decimal(dto.debitRate),
        credit1xRate: new Prisma.Decimal(dto.credit1xRate),
        creditInstallmentsRate: new Prisma.Decimal(dto.creditInstallmentsRate),
        pixRate: new Prisma.Decimal(dto.pixRate),
        cashRate: new Prisma.Decimal(dto.cashRate),
        anticipationRate: new Prisma.Decimal(dto.anticipationRate),
        applyAnticipation: dto.applyAnticipation ?? false,
      },
      update: {
        debitRate: new Prisma.Decimal(dto.debitRate),
        credit1xRate: new Prisma.Decimal(dto.credit1xRate),
        creditInstallmentsRate: new Prisma.Decimal(dto.creditInstallmentsRate),
        pixRate: new Prisma.Decimal(dto.pixRate),
        cashRate: new Prisma.Decimal(dto.cashRate),
        anticipationRate: new Prisma.Decimal(dto.anticipationRate),
        applyAnticipation: dto.applyAnticipation ?? false,
      },
    });

    const settings = mapFeeConfigToSettings(config);
    return {
      laundryId: dto.laundryId,
      debitRate: settings.debit,
      credit1xRate: settings.credit1x,
      creditInstallmentsRate: settings.creditInstallments,
      pixRate: settings.pix,
      cashRate: settings.cash,
      anticipationRate: settings.anticipation,
      applyAnticipation: settings.applyAnticipation,
    };
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
