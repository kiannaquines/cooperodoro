create table public.user_feedback (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  favorite_feature text check (favorite_feature in ('timer', 'cooper-mascot', 'tasks', 'themes', 'spotify')),
  improvement_comment text check (char_length(improvement_comment) <= 1000),
  status text not null default 'dismissed' check (status in ('submitted', 'dismissed')),
  next_prompt_session_count integer not null default 3 check (next_prompt_session_count >= 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_feedback_submission_complete check (
    (status = 'submitted' and rating is not null and favorite_feature is not null and submitted_at is not null)
    or (status = 'dismissed' and rating is null and favorite_feature is null and submitted_at is null)
  )
);

alter table public.user_feedback enable row level security;

grant select, insert, update, delete on public.user_feedback to authenticated;
grant all on public.user_feedback to service_role;

create policy user_feedback_select_own on public.user_feedback
  for select using ((select auth.uid()) = user_id);
create policy user_feedback_insert_own on public.user_feedback
  for insert with check ((select auth.uid()) = user_id);
create policy user_feedback_update_own on public.user_feedback
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_feedback_delete_own on public.user_feedback
  for delete using ((select auth.uid()) = user_id);

create trigger user_feedback_set_updated_at
  before update on public.user_feedback
  for each row execute function public.set_updated_at();
