# Migração para Vite + Supabase (sem TanStack Start, sem Google Sheets)

## Objetivo
Transformar o projeto em um app **Vite puro** (SPA) com **Supabase** como backend único: Auth, PostgreSQL, Storage e API automática. Remover toda a camada TanStack Start e a dependência do Google Sheets.

---

## 1. Limpeza (remover)

- `src/routes/` (TanStack Router) → `src/routeTree.gen.ts`, `__root.tsx`, `index.tsx`, `api/menu.ts`
- `src/router.tsx`, `src/start.ts`, `src/server.ts`
- `vite.config.ts` atual (baseado em `@lovable.dev/vite-tanstack-config`)
- `wrangler.jsonc` (Cloudflare Workers)
- Pacotes: `@tanstack/react-start`, `@tanstack/react-router`, `@lovable.dev/vite-tanstack-config`, `@cloudflare/vite-plugin`, `wrangler`
- Lógica de fetch da planilha em `public/menu.js` (CSV/gviz)
- Mocks de produtos hardcoded

## 2. Nova base Vite

- `vite.config.ts` minimalista: `@vitejs/plugin-react` + `@tailwindcss/vite` + alias `@`
- `index.html` na raiz montando `<div id="root">`
- `src/main.tsx` com `createRoot` + `react-router-dom` (SPA simples) + `QueryClientProvider`
- Instalar: `react-router-dom`, `@supabase/supabase-js`

## 3. Supabase (Lovable Cloud)

Ativar Lovable Cloud (se não estiver) e criar schema:

```sql
-- categorias
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int default 0,
  created_at timestamptz default now()
);

-- produtos
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  preco numeric(10,2) not null default 0,
  imagem text default '',
  categoria_id uuid references public.categorias(id) on delete set null,
  ativo boolean default true,
  ordem int default 0,
  created_at timestamptz default now()
);

-- roles (padrão seguro: tabela separada)
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
```

**RLS:**
- `categorias` / `produtos`: SELECT público (anon); INSERT/UPDATE/DELETE apenas `has_role(auth.uid(),'admin')`
- `user_roles`: SELECT do próprio usuário; nenhum INSERT/UPDATE/DELETE via client (gerenciado por SQL)

**Storage bucket** `produtos` (público) para imagens, com policy de upload restrita a admins.

## 4. Frontend

Páginas (react-router-dom):
- `/` — Cardápio público (lê `produtos` + `categorias` do Supabase em tempo real via `supabase.channel`)
- `/login` — email/senha (Supabase Auth)
- `/admin` — protegida; requer `has_role admin`
  - CRUD de Categorias
  - CRUD de Produtos (com upload de imagem para Storage)
  - Toggle ativo, edição de preço inline

Reaproveitar visual atual do cardápio (`public/menu.html/css/js`) reescrito em React + Tailwind, mantendo: drawer da sacola, FAB "Ver Sacola", botão "Voltar para pedir mais", checkout WhatsApp.

Estado do carrinho: `localStorage` (igual hoje).
Realtime: `supabase.channel('produtos').on('postgres_changes', ...)` para atualizar cardápio sem reload.

## 5. Deploy

- Vercel: build `vite build`, output `dist/`
- Supabase: gerenciado via Lovable Cloud
- Sem Cloudflare Workers, sem TanStack Start, sem Edge Functions

---

## Detalhes técnicos

- Cliente Supabase: `src/integrations/supabase/client.ts` (já existe se Cloud ativo)
- Proteção de rota admin: componente `<RequireAdmin>` que chama `has_role` RPC
- Para "primeiro admin": após signup, rodar SQL `insert into user_roles(user_id, role) values ('<uid>','admin')` — instruir usuário no fim
- WhatsApp checkout permanece client-side (sem backend)

---

## Perguntas antes de implementar

1. **Lovable Cloud já está ativo?** Se não, vou ativar — isso provisiona Supabase automaticamente.
2. **Manter os dados atuais da planilha?** Posso fazer um seed inicial com os produtos hoje listados, ou começar com banco vazio?
3. **Quem será o primeiro admin?** Posso criar o usuário inicial via SQL após você fornecer o email, ou você cria via tela `/login` (signup) e eu te passo o SQL para promover a admin.
4. **Confirmação:** está OK descartar todo o código TanStack/rota `/api/menu`? Não há nada além do cardápio nesse backend hoje, mas confirmo antes de deletar.

Após suas respostas, executo a migração completa.
