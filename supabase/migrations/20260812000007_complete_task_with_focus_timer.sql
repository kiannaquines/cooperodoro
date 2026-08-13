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

  if acknowledged.id is not null
    and acknowledged.phase = 'focus'
    and acknowledged.task_id is not null then
    update public.tasks
    set is_completed = true,
        completed_at = coalesce(completed_at, acknowledged.completed_at),
        updated_at = now()
    where id = acknowledged.task_id
      and user_id = auth.uid()
      and not is_completed;
  end if;

  return acknowledged;
end;
$$;

grant execute on function public.acknowledge_timer_run(uuid) to authenticated;
