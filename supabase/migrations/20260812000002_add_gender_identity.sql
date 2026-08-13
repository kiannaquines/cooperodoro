alter table public.user_settings
  add column gender_identity text
  constraint user_settings_gender_identity_check
  check (gender_identity in ('woman', 'man', 'non-binary', 'prefer-not-to-say'));
