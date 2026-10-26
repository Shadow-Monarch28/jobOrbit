update auth.users
set encrypted_password = extensions.crypt('kaizokuo@1234', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'admin@joborbit.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@joborbit.com';