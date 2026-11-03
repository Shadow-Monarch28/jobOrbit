-- Marks admin@joborbit.com as the site admin: admins see raw error details in
-- the app, everyone else sees "Action Unsuccessful".
-- 1) Supabase Dashboard > Authentication > Users > Add user > Create new user
--    (email admin@joborbit.com, your password, tick "Auto Confirm User").
-- 2) Run this script once. 3) Sign out and back in as that user.
-- app_metadata can only be changed here, never by a user themselves.
-- Shortcut: supabase/admin.sql does steps 1 and 2 in one go (demo password).
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@joborbit.com';

-- To remove admin later:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = '...';

-- OPTIONAL: set or change the admin's password with SQL instead of the dashboard.
-- Replace the text between the quotes, run it once, then delete it from the editor.
-- (Passwords are stored hashed; plain text is never saved.)
-- update auth.users
-- set encrypted_password = extensions.crypt('PUT-THE-ADMIN-PASSWORD-HERE', extensions.gen_salt('bf')),
--     updated_at = now()
-- where email = 'admin@joborbit.com';
