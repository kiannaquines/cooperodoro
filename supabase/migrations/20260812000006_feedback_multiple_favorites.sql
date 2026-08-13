alter table public.user_feedback
  drop constraint user_feedback_submission_complete;

alter table public.user_feedback
  add column favorite_features text[] not null default '{}';

update public.user_feedback
set favorite_features = array[favorite_feature]
where favorite_feature is not null;

alter table public.user_feedback
  add constraint user_feedback_favorite_features_check check (
    favorite_features <@ array['timer', 'cooper-mascot', 'tasks', 'themes', 'spotify']::text[]
    and cardinality(favorite_features) between 0 and 5
  ),
  add constraint user_feedback_submission_complete check (
    (status = 'submitted' and rating is not null and cardinality(favorite_features) > 0 and submitted_at is not null)
    or (status = 'dismissed' and rating is null and cardinality(favorite_features) = 0 and submitted_at is null)
  );

alter table public.user_feedback
  drop column favorite_feature;
