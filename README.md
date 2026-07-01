# LavLand

Sistema web de gestão financeira e operacional para lavanderia express. Complementa o MaxPan (controle físico de máquinas) com foco em receitas, despesas, lucro, fluxo de caixa, estoque e relatórios.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | NestJS, TypeScript, PostgreSQL, Prisma 7, JWT |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Infra | Docker Compose (PostgreSQL + API + frontend), Render (API + PostgreSQL) |

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

## Deploy do backend (Render)

O arquivo `render.yaml` na raiz provisiona automaticamente:

- **lavland-db** — PostgreSQL (plano free)
- **lavland-api** — Web Service Node.js com a API NestJS

### Passo a passo

1. Acesse [render.com](https://render.com) e conecte o repositório GitHub `lavland`.
2. Crie um **Blueprint** apontando para o branch `main`. O Render detecta o `render.yaml` e cria os dois recursos.
3. No serviço **lavland-api**, defina manualmente a variável **`FRONTEND_URL`** com a URL de produção do frontend (ex.: `https://seu-app.vercel.app`). Sem isso, o CORS bloqueia requisições do browser.
4. Aguarde o primeiro deploy. O build executa:
   - `prisma generate` + `nest build`
   - `prisma migrate deploy`
   - seed (categorias, lavanderia padrão e usuário admin)
5. Valide a API:
   - `GET https://lavland-api.onrender.com/api/health` → `{ "status": "ok", "database": "connected" }`
   - `POST https://lavland-api.onrender.com/api/auth/login` com as credenciais do seed

### Variáveis no Render

| Variável | Origem |
|----------|--------|
| `DATABASE_URL` | Vinculada automaticamente ao `lavland-db` |
| `JWT_SECRET` | Gerado automaticamente pelo Render |
| `JWT_EXPIRES_IN` | `7d` (definido no blueprint) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | **Definir manualmente** no dashboard (URL exata do Vercel, sem `/` no final). Aceita várias origens separadas por vírgula. |

### Frontend em produção (Vercel)

O frontend é deployado na [Vercel](https://vercel.com) (recomendado para Next.js).

#### Passo a passo

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório `rodmartinsfernandes/lavland`.
2. Em **Root Directory**, clique em *Edit* e selecione **`frontend`**.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://lavland-api.onrender.com/api` |

4. Clique em **Deploy** e aguarde o build.
5. Copie a URL gerada (ex.: `https://lavland.vercel.app`).
6. No Render, abra **lavland-api → Environment** e atualize **`FRONTEND_URL`** com essa URL (sem barra no final). O serviço reinicia automaticamente.

#### Validar

- Acesse a URL do frontend e faça login com `admin@lavland.local` / `admin123`.
- Se o login falhar com erro de CORS, confira se `FRONTEND_URL` no Render corresponde exatamente à URL do Vercel.

### Observações

- O plano free do Render coloca o serviço em sleep após inatividade (cold start de ~30s na primeira requisição).
- Troque a senha do usuário admin (`admin@lavland.local`) após o primeiro acesso em produção.
- Novos pushes no `main` disparam redeploy automático (`autoDeploy: true`).

## Integração MaxPan

Fora de escopo nesta versão. O campo `source` em receitas já prevê origem `MAXPAN` para lançamentos manuais de faturamento.

## Licença

Projeto privado — uso interno.
