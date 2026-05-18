
-- =========== ROLES ===========
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- =========== CATEGORIAS ===========
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;

create policy "categorias publicas leitura" on public.categorias
  for select using (true);
create policy "categorias admin insert" on public.categorias
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "categorias admin update" on public.categorias
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "categorias admin delete" on public.categorias
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- =========== PRODUTOS ===========
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null default 0,
  imagem text not null default '',
  categoria_id uuid references public.categorias(id) on delete set null,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.produtos enable row level security;

create policy "produtos publicos leitura" on public.produtos
  for select using (true);
create policy "produtos admin insert" on public.produtos
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "produtos admin update" on public.produtos
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "produtos admin delete" on public.produtos
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- =========== PRIMEIRO USUARIO = ADMIN ===========
create or replace function public.handle_new_user_admin()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.handle_new_user_admin();

-- =========== REALTIME ===========
alter publication supabase_realtime add table public.produtos;
alter publication supabase_realtime add table public.categorias;

-- =========== STORAGE ===========
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true);

create policy "produtos imagens leitura publica" on storage.objects
  for select using (bucket_id = 'produtos');
create policy "produtos imagens admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos' and public.has_role(auth.uid(),'admin'));
create policy "produtos imagens admin update" on storage.objects
  for update to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(),'admin'));
create policy "produtos imagens admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(),'admin'));

-- =========== SEED ===========
with c as (
  insert into public.categorias (nome, ordem) values
    ('Bolos e Tortas', 1),
    ('Doces Finos', 2),
    ('Bebidas', 3)
  returning id, nome
)
insert into public.produtos (nome, descricao, preco, imagem, categoria_id, ordem)
select v.nome, v.descricao, v.preco, v.imagem, c.id, v.ordem
from (values
  ('Bolo Vulcão',  'Ninho',     28.90, '/imagens/logo-amanda.jpeg', 'Bolos e Tortas', 1),
  ('Bolo Vulcão',  'Chocolate', 34.50, '/imagens/bolo-vulcao.jpeg', 'Bolos e Tortas', 2),
  ('Caseirinho',   'Chocolate', 49.90, '/imagens/caseirinho.jpeg', 'Doces Finos', 1),
  ('Coca-Cola 350ml', 'Lata 350ml.', 7.00, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600', 'Bebidas', 1)
) as v(nome, descricao, preco, imagem, cat_nome, ordem)
join c on c.nome = v.cat_nome;
