alter table public.user_settings
  add column theme_key text not null default 'strawberry-milk'
  constraint user_settings_theme_key_check
  check (theme_key in ('strawberry-milk', 'blueberry-cloud', 'lavender-dream', 'matcha-cream'));
