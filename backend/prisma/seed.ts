import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { createPrismaPgAdapter } from '../src/prisma/pg-adapter';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não configurado');
}

const adapter = createPrismaPgAdapter(connectionString);
const prisma = new PrismaClient({ adapter });

const expenseCategories = [
  { name: 'Aluguel', slug: 'aluguel' },
  { name: 'Energia elétrica', slug: 'energia-eletrica' },
  { name: 'Água', slug: 'agua' },
  { name: 'Internet', slug: 'internet' },
  { name: 'Produtos de limpeza', slug: 'produtos-de-limpeza' },
  { name: 'Manutenção de máquinas', slug: 'manutencao-de-maquinas' },
  { name: 'Funcionários', slug: 'funcionarios' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Contabilidade', slug: 'contabilidade' },
  { name: 'Taxas de cartão', slug: 'taxas-de-cartao' },
  { name: 'Impostos', slug: 'impostos' },
  { name: 'Outros', slug: 'outros' },
];

async function main() {
  for (const category of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, active: true },
      create: category,
    });
  }

  const laundry = await prisma.laundry.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'Lavanderia Express' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Lavanderia Express',
      address: 'Endereço a definir',
    },
  });

  await prisma.laundryFeeConfig.upsert({
    where: { laundryId: laundry.id },
    update: {},
    create: {
      laundryId: laundry.id,
      debitRate: 1.45,
      credit1xRate: 2.1,
      creditInstallmentsRate: 2.34,
      pixRate: 0,
      cashRate: 0,
      anticipationRate: 1.29,
      applyAnticipation: false,
    },
  });

  const adminEmail = 'admin@lavland.local';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        password: passwordHash,
        role: 'ADMIN',
        laundryId: laundry.id,
      },
    });
    console.log('Usuário admin criado: admin@lavland.local / admin123');
  }

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
