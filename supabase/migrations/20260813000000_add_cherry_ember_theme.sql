alter table public.user_settings
  drop constraint user_settings_theme_key_check;

alter table public.user_settings
  add constraint user_settings_theme_key_check
  check (theme_key in (
    'strawberry-milk',
    'blueberry-cloud',
    'lavender-dream',
    'matcha-cream',
    'cherry-ember',
    'midnight-navy',
    'forest-trail',
    'graphite-blue'
  ));
