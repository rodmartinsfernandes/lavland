import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType } from '../common/enums/financial.enum';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, resolvePagination } from '../common/dto/pagination.dto';
import { toNumber } from '../common/utils/financial.util';
import {
  CreateInventoryMovementDto,
  CreateInventoryProductDto,
  InventoryFilterDto,
  UpdateInventoryProductDto,
} from './dto/inventory.dto';

const productInclude = {
  laundry: { select: { id: true, name: true } },
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(dto: CreateInventoryProductDto) {
    await this.ensureLaundryExists(dto.laundryId);

    return this.formatProduct(
      await this.prisma.inventoryProduct.create({
        data: {
          name: dto.name,
          unit: dto.unit,
          unitCost: new Prisma.Decimal(dto.unitCost),
          minStock: new Prisma.Decimal(dto.minStock ?? 0),
          laundryId: dto.laundryId,
        },
        include: productInclude,
      }),
    );
  }

  async findAllProducts(filters: InventoryFilterDto) {
    const { page, limit, skip } = resolvePagination(filters);

    const where = {
      ...(filters.laundryId && { laundryId: filters.laundryId }),
    };

    const products = await this.prisma.inventoryProduct.findMany({
      where,
      skip: filters.lowStockOnly ? undefined : skip,
      take: filters.lowStockOnly ? undefined : limit,
      orderBy: { name: 'asc' },
      include: productInclude,
    });

    const formatted = products
      .map((product) => this.formatProduct(product))
      .filter((product) =>
        filters.lowStockOnly ? product.isLowStock : true,
      );

    const data = filters.lowStockOnly
      ? formatted.slice(skip, skip + limit)
      : formatted;

    const total = filters.lowStockOnly
      ? formatted.length
      : await this.prisma.inventoryProduct.count({ where });

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

  async findProduct(id: string) {
    const product = await this.prisma.inventoryProduct.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.formatProduct(product);
  }

  async deleteProduct(id: string) {
    await this.findProduct(id);

    const movementCount = await this.prisma.inventoryMovement.count({
      where: { productId: id },
    });

    if (movementCount > 0) {
      throw new BadRequestException(
        'Produto com movimentações não pode ser excluído',
      );
    }

    await this.prisma.inventoryProduct.delete({ where: { id } });
    return { success: true };
  }

  async updateProduct(id: string, dto: UpdateInventoryProductDto) {
    await this.findProduct(id);

    if (dto.laundryId) {
      await this.ensureLaundryExists(dto.laundryId);
    }

    const updated = await this.prisma.inventoryProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.unitCost !== undefined && {
          unitCost: new Prisma.Decimal(dto.unitCost),
        }),
        ...(dto.minStock !== undefined && {
          minStock: new Prisma.Decimal(dto.minStock),
        }),
        ...(dto.laundryId && { laundryId: dto.laundryId }),
      },
      include: productInclude,
    });

    return this.formatProduct(updated);
  }

  async addMovement(productId: string, dto: CreateInventoryMovementDto) {
    const product = await this.findProduct(productId);
    const currentStock = toNumber(product.currentStock);
    const quantity = dto.quantity;

    if (
      dto.type === InventoryMovementType.OUT &&
      quantity > currentStock
    ) {
      throw new BadRequestException('Estoque insuficiente para saída');
    }

    const stockDelta =
      dto.type === InventoryMovementType.IN ? quantity : -quantity;

    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: {
          type: dto.type,
          quantity: new Prisma.Decimal(quantity),
          unitCost:
            dto.unitCost !== undefined
              ? new Prisma.Decimal(dto.unitCost)
              : undefined,
          note: dto.note,
          productId,
        },
      }),
      this.prisma.inventoryProduct.update({
        where: { id: productId },
        data: {
          currentStock: new Prisma.Decimal(currentStock + stockDelta),
          ...(dto.type === InventoryMovementType.IN &&
            dto.unitCost !== undefined && {
              unitCost: new Prisma.Decimal(dto.unitCost),
            }),
        },
      }),
    ]);

    return {
      movement,
      product: await this.findProduct(productId),
    };
  }

  async getMovements(productId: string, pagination: PaginationDto) {
    await this.findProduct(productId);

    const { page, limit, skip } = resolvePagination(pagination);

    const where = { productId };

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
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

  async getConsumptionReport(laundryId?: string) {
    const products = await this.prisma.inventoryProduct.findMany({
      where: laundryId ? { laundryId } : undefined,
      include: {
        movements: {
          where: { type: InventoryMovementType.OUT },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => {
      const totalOut = product.movements.reduce(
        (sum, movement) => sum + toNumber(movement.quantity),
        0,
      );

      return {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        currentStock: toNumber(product.currentStock),
        totalConsumed: totalOut,
        isLowStock: toNumber(product.currentStock) <= toNumber(product.minStock),
      };
    });
  }

  private formatProduct<
    T extends {
      currentStock: { toNumber(): number };
      minStock: { toNumber(): number };
    },
  >(product: T) {
    const currentStock = toNumber(product.currentStock);
    const minStock = toNumber(product.minStock);

    return {
      ...product,
      isLowStock: currentStock <= minStock,
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
