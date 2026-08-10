-- Creating a table and enabling RLS on it does not automatically make it
-- broadcast Postgres Changes over Realtime — that requires explicitly
-- adding it to the supabase_realtime publication. Without this, every
-- .channel(...).on('postgres_changes', ...) subscription against `messages`
-- (useMessages.js, useUnreadCounts.js) silently never receives anything;
-- the initial fetch still works, it just never updates live.
alter publication supabase_realtime add table messages;
