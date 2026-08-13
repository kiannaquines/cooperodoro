begin;

select plan(21);

select has_table('public', 'timer_presets', 'timer_presets exists');
select has_table('public', 'timer_runs', 'timer_runs exists');
select has_table('public', 'tasks', 'tasks exists');
select has_table('public', 'spotify_embeds', 'spotify_embeds exists');
select has_table('public', 'user_settings', 'user_settings exists');
select has_table('public', 'user_feedback', 'user feedback exists');
select has_column('public', 'user_feedback', 'next_prompt_session_count', 'feedback reminder threshold exists');
select col_has_check('public', 'user_feedback', 'rating', 'feedback rating is constrained');
select col_has_check('public', 'user_feedback', 'favorite_features', 'favorite features are constrained');
select has_column('public', 'user_settings', 'theme_key', 'theme setting exists');
select has_column('public', 'user_settings', 'gender_identity', 'optional gender identity setting exists');
select has_column('public', 'user_settings', 'tour_completed_at', 'product tour completion is recorded');
select col_default_is('public', 'user_settings', 'theme_key', 'blueberry-cloud', 'theme defaults to Blueberry Cloud');
select col_has_check('public', 'user_settings', 'theme_key', 'theme setting only accepts curated palettes');
select has_table('public', 'push_subscriptions', 'push_subscriptions exists');
select has_table('public', 'timer_notification_deliveries', 'delivery ledger exists');
select has_function(
  'public',
  'claim_due_timer_notifications',
  array['integer'],
  'notification claim function exists'
);
select has_function(
  'public',
  'acknowledge_timer_run',
  array['uuid'],
  'acknowledgement function exists'
);
select has_index(
  'public',
  'timer_runs',
  'timer_runs_one_active_per_user',
  'active timer uniqueness is enforced'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'timer_presets', 'timer_runs', 'tasks', 'spotify_embeds',
        'user_settings', 'user_feedback', 'push_subscriptions'
      )
  $$,
  $$values (28::bigint)$$,
  'every client table has select, insert, update, and delete ownership policies'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and policyname like 'user_backgrounds_%_own'
  $$,
  $$values (4::bigint)$$,
  'background storage has four owner-scoped policies'
);
select throws_ok(
  $$select public.claim_due_timer_notifications(0)$$,
  'P0001',
  'batch_size must be between 1 and 500',
  'invalid batch size is rejected'
);

select * from finish();
rollback;
