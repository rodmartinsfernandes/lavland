import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, resolvePagination } from '../common/dto/pagination.dto';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug já cadastrado');
    }

    return this.prisma.expenseCategory.create({ data: dto });
  }

  async findAll(pagination: PaginationDto, activeOnly = true) {
    const { page, limit, skip } = resolvePagination(pagination);

    const where = activeOnly ? { active: true } : {};

    const [data, total] = await Promise.all([
      this.prisma.expenseCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.expenseCategory.count({ where }),
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
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(id: string, dto: UpdateExpenseCategoryDto) {
    await this.findOne(id);

    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }
}
