-- Row Level Security : chaque utilisateur ne voit et ne modifie que ses propres données.

-- Tables avec colonne user_id directe
do $$
declare t text;
begin
  foreach t in array array[
    'user_preferences','user_settings','goals','projects','tasks','task_history',
    'financial_accounts','savings_goals','financial_transactions','savings_contributions','budgets',
    'study_sessions','exercise_sessions','sleep_records','habits','habit_entries',
    'skills','skill_activities','notifications','ai_reports','ai_usage'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Profils : la clé primaire est l'identifiant utilisateur
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- L'insertion se fait par le trigger handle_new_user (security definer). Pas de policy insert côté client.

-- Modèles d'objectifs : lecture seule pour tous les utilisateurs connectés
alter table public.goal_templates enable row level security;
create policy goal_templates_read on public.goal_templates for select to authenticated using (true);

-- Journal d'audit : aucun accès client (écriture serveur uniquement)
alter table public.audit_events enable row level security;

-- ───────── Garde-fous sur les relations (pas d'ID d'un autre utilisateur via une clé étrangère) ─────────
create or replace function public.assert_same_owner(parent_table regclass, parent_id uuid, owner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if parent_id is null then return; end if;
  execute format('select exists(select 1 from %s where id = $1 and user_id = $2)', parent_table)
    into ok using parent_id, owner;
  if not ok then raise exception 'Référence invalide' using errcode = '42501'; end if;
end $$;

create or replace function public.check_task_refs() returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.goals', new.goal_id, new.user_id);
  perform public.assert_same_owner('public.projects', new.project_id, new.user_id);
  return new;
end $$;
create trigger tasks_check_refs before insert or update on public.tasks
  for each row execute function public.check_task_refs();

create or replace function public.check_contribution_refs() returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.savings_goals', new.savings_goal_id, new.user_id);
  return new;
end $$;
create trigger contributions_check_refs before insert or update on public.savings_contributions
  for each row execute function public.check_contribution_refs();

create or replace function public.check_habit_entry_refs() returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.habits', new.habit_id, new.user_id);
  return new;
end $$;
create trigger habit_entries_check_refs before insert or update on public.habit_entries
  for each row execute function public.check_habit_entry_refs();

create or replace function public.check_skill_activity_refs() returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.skills', new.skill_id, new.user_id);
  return new;
end $$;
create trigger skill_activities_check_refs before insert or update on public.skill_activities
  for each row execute function public.check_skill_activity_refs();

-- Interdit de changer le propriétaire d'un enregistrement
create or replace function public.forbid_owner_change() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Le propriétaire ne peut pas être modifié' using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['goals','projects','tasks','financial_accounts','savings_goals',
    'financial_transactions','savings_contributions','budgets','study_sessions','exercise_sessions',
    'sleep_records','habits','habit_entries','skills','skill_activities','notifications','ai_reports']
  loop
    execute format('create trigger %1$s_no_owner_change before update on public.%1$I
                    for each row execute function public.forbid_owner_change()', t);
  end loop;
end $$;

-- updated_at automatique
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','user_settings','goals','tasks','financial_transactions']
  loop
    execute format('create trigger %1$s_touch before update on public.%1$I
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
