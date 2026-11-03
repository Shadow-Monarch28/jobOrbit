-- JobOrbit admin account (DEMO / TESTING ONLY)
-- ---------------------------------------------------------------------------
-- Creates admin@joborbit.com if it does not exist, confirms the email, sets the
-- demo password below and marks the account as admin (app_metadata.role = 'admin').
-- Safe to run more than once: it resets the password and role each time.
--
-- Run it in Supabase Dashboard > SQL Editor, then sign in with:
--     email:    admin@joborbit.com
--     password: kaizokuo@1234
--
-- This is a demo password that lives in the repository. Before real users arrive,
-- change it (Dashboard > Authentication > Users > admin@joborbit.com) and delete
-- or edit this file.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_id uuid;
  admin_email constant text := 'admin@joborbit.com';
  admin_password constant text := 'kaizokuo@1234';
begin
  select id into admin_id from auth.users where email = admin_email;

  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', admin_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(admin_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        updated_at = now()
    where id = admin_id;
  end if;
end $$;

-- To remove admin rights later:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = 'admin@joborbit.com';
