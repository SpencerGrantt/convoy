-- Same gap as 013_messages_realtime.sql, this time on profiles: creating a
-- table and enabling RLS does not automatically make it broadcast Postgres
-- Changes over Realtime — that requires explicitly adding it to the
-- supabase_realtime publication. Without this, useTeamMembers.js's
-- .channel(...).on('postgres_changes', ...) subscription against `profiles`
-- silently never receives anything; the initial fetch still works, it just
-- never updates live. Needed so a role change made in Settings.jsx shows up
-- in the Sidebar's team list without a manual refresh.
alter publication supabase_realtime add table profiles;
