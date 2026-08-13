create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.timer_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  focus_minutes smallint not null default 25 check (focus_minutes between 1 and 180),
  short_break_minutes smallint not null default 5 check (short_break_minutes between 1 and 60),
  long_break_minutes smallint not null default 15 check (long_break_minutes between 1 and 60),
  rounds_before_long_break smallint not null default 4 check (rounds_before_long_break between 1 and 12),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create unique index timer_presets_one_default_per_user
  on public.timer_presets (user_id)
  where is_default;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  notes text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint tasks_completion_consistent check (
    (is_completed and completed_at is not null)
    or (not is_completed and completed_at is null)
  )
);

create table public.spotify_embeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  playlist_id text not null check (playlist_id ~ '^[A-Za-z0-9]{10,40}$'),
  playlist_url text not null check (
    playlist_url ~ '^https://open\.spotify\.com/playlist/[A-Za-z0-9]{10,40}([?].*)?$'
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, playlist_id)
);

create unique index spotify_embeds_one_active_per_user
  on public.spotify_embeds (user_id)
  where is_active;
create index spotify_embeds_user_order_idx
  on public.spotify_embeds (user_id, sort_order, created_at);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  auto_start boolean not null default false,
  completion_sound text not null default 'soft-bell'
    check (completion_sound in ('soft-bell', 'wood-block', 'digital-chime', 'none')),
  browser_notifications boolean not null default false,
  background_key text not null default 'rainy-desk' check (char_length(background_key) between 1 and 255),
  background_dimming smallint not null default 45 check (background_dimming between 0 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 10 and 4096),
  p256dh text not null check (char_length(p256dh) between 20 and 512),
  auth text not null check (char_length(auth) between 8 and 256),
  user_agent text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.timer_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preset_id uuid,
  task_id uuid,
  phase text not null check (phase in ('focus', 'short_break', 'long_break')),
  round_number smallint not null check (round_number between 1 and 12),
  focus_seconds integer not null check (focus_seconds between 60 and 10800),
  short_break_seconds integer not null check (short_break_seconds between 60 and 3600),
  long_break_seconds integer not null check (long_break_seconds between 60 and 3600),
  rounds_before_long_break smallint not null check (rounds_before_long_break between 1 and 12),
  duration_seconds integer not null check (duration_seconds between 60 and 10800),
  started_at timestamptz,
  ends_at timestamptz,
  paused_remaining_seconds integer check (paused_remaining_seconds >= 0),
  status text not null default 'paused'
    check (status in ('running', 'paused', 'awaiting_acknowledgement', 'completed', 'skipped', 'reset')),
  completed_at timestamptz,
  notification_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timer_runs_running_timestamps check (
    status <> 'running' or (started_at is not null and ends_at is not null)
  ),
  constraint timer_runs_paused_remainder check (
    status <> 'paused' or paused_remaining_seconds is not null
  ),
  constraint timer_runs_preset_owned foreign key (preset_id, user_id)
    references public.timer_presets(id, user_id) on delete set null (preset_id),
  constraint timer_runs_task_owned foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete set null (task_id)
);

create unique index timer_runs_one_active_per_user
  on public.timer_runs (user_id)
  where status in ('running', 'paused', 'awaiting_acknowledgement');
create index timer_runs_due_idx
  on public.timer_runs (ends_at)
  where status = 'running';
create index timer_runs_user_history_idx
  on public.timer_runs (user_id, completed_at desc)
  where status = 'completed';

-- Internal delivery ledger. Clients never receive direct access to this table.
create table public.timer_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  timer_run_id uuid not null references public.timer_runs(id) on delete cascade,
  push_subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (timer_run_id, push_subscription_id)
);

create index timer_notification_deliveries_pending_idx
  on public.timer_notification_deliveries (next_attempt_at)
  where sent_at is null and attempts < 5;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'timer_presets', 'tasks', 'spotify_embeds', 'user_settings',
    'push_subscriptions', 'timer_runs', 'timer_notification_deliveries'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on
  public.timer_presets,
  public.tasks,
  public.spotify_embeds,
  public.user_settings,
  public.push_subscriptions,
  public.timer_runs
to authenticated;
grant all on all tables in schema public to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'timer_presets', 'tasks', 'spotify_embeds', 'user_settings',
    'push_subscriptions', 'timer_runs'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'timer_presets', 'tasks', 'spotify_embeds', 'user_settings',
    'push_subscriptions', 'timer_runs', 'timer_notification_deliveries'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end;
$$;

create or replace function public.create_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.timer_presets (
    user_id, name, focus_minutes, short_break_minutes,
    long_break_minutes, rounds_before_long_break, is_default
  ) values (new.id, 'Classic Pomodoro', 25, 5, 15, 4, true)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_user_defaults();

-- Backfill defaults when this migration is applied to a project with existing users.
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.timer_presets (
  user_id, name, focus_minutes, short_break_minutes,
  long_break_minutes, rounds_before_long_break, is_default
)
select id, 'Classic Pomodoro', 25, 5, 15, 4, true
from auth.users
where not exists (
  select 1 from public.timer_presets preset
  where preset.user_id = auth.users.id and preset.is_default
)
on conflict (user_id, name) do nothing;

-- Atomically transitions expired timers once, creates one delivery per device,
-- and leases retryable deliveries to one dispatcher invocation.
create or replace function public.claim_due_timer_notifications(batch_size integer default 100)
returns table (
  delivery_id uuid,
  timer_run_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_key text,
  phase text,
  attempts smallint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if batch_size < 1 or batch_size > 500 then
    raise exception 'batch_size must be between 1 and 500';
  end if;

  with due as (
    update public.timer_runs run
    set status = 'awaiting_acknowledgement',
        completed_at = coalesce(run.completed_at, run.ends_at, now()),
        notification_processed_at = coalesce(run.notification_processed_at, now()),
        updated_at = now()
    where run.status = 'running'
      and run.ends_at <= now()
    returning run.id, run.user_id
  )
  insert into public.timer_notification_deliveries (timer_run_id, push_subscription_id)
  select due.id, subscription.id
  from due
  join public.push_subscriptions subscription
    on subscription.user_id = due.user_id
   and subscription.is_active
  on conflict do nothing;

  return query
  with candidates as (
    select delivery.id
    from public.timer_notification_deliveries delivery
    where delivery.sent_at is null
      and delivery.attempts < 5
      and delivery.next_attempt_at <= now()
      and (delivery.claimed_at is null or delivery.claimed_at < now() - interval '5 minutes')
    order by delivery.next_attempt_at, delivery.created_at
    for update skip locked
    limit batch_size
  ), claimed as (
    update public.timer_notification_deliveries delivery
    set claimed_at = now(),
        attempts = delivery.attempts + 1,
        updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select
    claimed.id,
    claimed.timer_run_id,
    subscription.id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    run.phase,
    claimed.attempts
  from claimed
  join public.timer_runs run on run.id = claimed.timer_run_id
  join public.push_subscriptions subscription
    on subscription.id = claimed.push_subscription_id
   and subscription.is_active;
end;
$$;

revoke all on function public.claim_due_timer_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_due_timer_notifications(integer) to service_role;

create or replace function public.acknowledge_timer_run(run_id uuid)
returns public.timer_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  acknowledged public.timer_runs;
begin
  update public.timer_runs
  set status = 'completed',
      completed_at = coalesce(completed_at, ends_at, now()),
      updated_at = now()
  where id = run_id
    and user_id = auth.uid()
    and (
      status = 'awaiting_acknowledgement'
      or (status = 'running' and ends_at <= now())
    )
  returning * into acknowledged;

  return acknowledged;
end;
$$;

grant execute on function public.acknowledge_timer_run(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-backgrounds',
  'user-backgrounds',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy user_backgrounds_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'user-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_backgrounds_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_backgrounds_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'user-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'user-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_backgrounds_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
