-- Marks ONE account as the site admin. Admins see raw error details in the
-- app; every other account sees friendly messages. Replace the email, run
-- once, then sign out and back in on that account.
-- (app_metadata can only be changed here, never by the user themselves.)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'YOUR_ADMIN_EMAIL@example.com';

-- To remove admin later:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = '...';
