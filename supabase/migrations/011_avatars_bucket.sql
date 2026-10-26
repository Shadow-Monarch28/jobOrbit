-- Public bucket for profile pictures. Each user may only write inside their
-- own folder (<user id>/avatar.jpg); anyone can read, so the image URL works
-- in <img> tags. Safe to re-run.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Uploading over an existing picture (upsert) also needs read access to the row.
drop policy if exists "Avatars are readable" on storage.objects;
create policy "Avatars are readable" on storage.objects for select to public
  using (bucket_id = 'avatars');
