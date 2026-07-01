# LavLand

Sistema web de gestão financeira e operacional para lavanderia express. Complementa o MaxPan (controle físico de máquinas) com foco em receitas, despesas, lucro, fluxo de caixa, estoque e relatórios.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | NestJS, TypeScript, PostgreSQL, Prisma 7, JWT |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Infra | Docker Compose (PostgreSQL + API + frontend) |

## Estrutura do projeto

```
lavland/
├── backend/          # API NestJS
├── frontend/         # App Next.js (porta 3001)
├── docker-compose.yml
└── package.json      # Scripts do monorepo
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (opcional, para subir tudo em containers)
- PostgreSQL 16 (se rodar backend localmente sem Docker)

## Como rodar

### Opção 1 — Docker (recomendado)

```bash
npm run docker:up
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000/api |
| PostgreSQL | localhost:5432 |

Parar os containers:

```bash
npm run docker:down
```

Reset completo (apaga volumes e recria o banco):

```bash
npm run docker:reset
```

### Opção 2 — Desenvolvimento local

```bash
# Terminal 1 — banco
docker compose up postgres -d

# Terminal 2 — backend (:3000)
cd backend && cp .env.example .env   # se ainda não existir
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev

# Terminal 3 — frontend (:3001)
cd frontend && cp .env.local.example .env.local
npm install
npm run dev
```

Ou na raiz:

```bash
npm run start:dev        # backend
npm run start:frontend   # frontend
```

## Credenciais padrão (seed)

| Campo | Valor |
|-------|-------|
| E-mail | `admin@lavland.local` |
| Senha | `admin123` |
| Perfil | Administrador |

## Perfis de usuário

### Administrador (`ADMIN`)

Acesso completo:

- Dashboard e relatórios financeiros
- Receitas, despesas, contas a pagar
- Máquinas, estoque (CRUD completo)
- Configuração da lavanderia
- Gestão de usuários
- Exportação CSV (relatórios e estoque)

### Operador (`OPERATOR`)

Visão simplificada para o dia a dia:

- **Início** (`/operador`) — atalhos e últimos lançamentos
- **Receitas** — criar e editar (sem excluir)
- **Despesas** — criar e editar (sem excluir)
- **Estoque** — apenas movimentar insumos (sem cadastrar/excluir produtos)

Operadores **não** acessam: Dashboard, Relatórios, Contas a pagar, Máquinas, Lavanderia, Usuários.

## Módulos da API

| Módulo | Prefixo | Descrição |
|--------|---------|-----------|
| Auth | `/api/auth` | Login, registro, perfil |
| Users | `/api/users` | CRUD usuários (admin) |
| Laundry | `/api/laundries` | Dados da lavanderia |
| Revenues | `/api/revenues` | Receitas |
| Expenses | `/api/expenses` | Despesas |
| Payables | `/api/payables` | Contas a pagar |
| Machines | `/api/machines` | Máquinas |
| Inventory | `/api/inventory` | Estoque e movimentações |
| Dashboard | `/api/dashboard` | Indicadores (admin) |
| Reports | `/api/reports` | Relatórios (admin) |

## Paginação

Listagens usam query params `page` (padrão: 1) e `limit` (padrão: 20, máximo: 100). A resposta inclui:

```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
}
```

## Variáveis de ambiente

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lavland?schema=public
JWT_SECRET=sua-chave-secreta
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:3001
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Scripts úteis

```bash
npm run build              # Build backend + frontend
npm run prisma:migrate     # Aplicar migrations
npm run prisma:seed        # Popular banco com dados iniciais
npm run docker:logs        # Logs dos containers
```

## Prisma 7

O projeto usa Prisma 7 com configuração em `backend/prisma.config.ts` (não no `schema.prisma`). O client é gerado em `backend/src/generated/prisma` com `moduleFormat = "cjs"`.

## Integração MaxPan

Fora de escopo nesta versão. O campo `source` em receitas já prevê origem `MAXPAN` para lançamentos manuais de faturamento.

## Licença

Projeto privado — uso interno.
