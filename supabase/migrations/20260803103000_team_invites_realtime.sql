do $$
begin
  alter publication supabase_realtime add table public.team_invites;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
