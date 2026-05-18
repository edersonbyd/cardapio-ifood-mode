
-- Restrict bucket listing to admins only (individual file reads still public via direct URL)
drop policy if exists "produtos imagens leitura publica" on storage.objects;
create policy "produtos imagens leitura admin list" on storage.objects
  for select to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(),'admin'));

-- Revoke public execute on security definer functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user_admin() from public, anon, authenticated;
