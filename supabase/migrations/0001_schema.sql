-- LifeOS AI — schéma initial. À exécuter dans l'éditeur SQL Supabase (ou via `supabase db push`).
create extension if not exists "pgcrypto";

-- ───────────────────────── Profils & préférences ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  language text not null default 'fr',
  timezone text not null default 'Africa/Casablanca',
  currency text not null default 'MAD',
  onboarding_step int not null default 1 check (onboarding_step between 1 and 5),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active_categories text[] not null default '{}',
  wake_time time,
  bed_time time,
  work_start time,
  work_end time,
  days_off int[] not null default '{}',          -- 0 = dimanche … 6 = samedi
  week_start int not null default 1 check (week_start between 0 and 6),
  reminders jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark','system')),
  ai_enabled boolean not null default true,
  email_reminders boolean not null default false,
  browser_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Objectifs ─────────────────────────
create table public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  target_value numeric not null check (target_value > 0),
  unit text not null,
  period text not null check (period in ('day','week','month','year','custom')),
  calc_method text not null default 'numeric' check (calc_method in ('numeric','count','duration','financial','custom'))
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  target_value numeric not null check (target_value > 0),
  current_value numeric not null default 0 check (current_value >= 0),
  unit text not null,
  start_date date not null default current_date,
  deadline date,
  period text not null default 'month' check (period in ('day','week','month','year','custom')),
  calc_method text not null default 'numeric' check (calc_method in ('numeric','count','duration','financial','custom')),
  status text not null default 'active' check (status in ('active','completed','expired','archived')),
  reminder_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline is null or deadline >= start_date)
);
create index goals_user_idx on public.goals(user_id, status);

-- ───────────────────────── Projets ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text,
  deadline date,
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  created_at timestamptz not null default now()
);
create index projects_user_idx on public.projects(user_id);

-- ───────────────────────── Tâches ─────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  notes text,
  category text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  estimated_minutes int check (estimated_minutes is null or estimated_minutes >= 0),
  actual_minutes int check (actual_minutes is null or actual_minutes >= 0),
  reminder_minutes_before int check (reminder_minutes_before is null or reminder_minutes_before >= 0),
  goal_id uuid references public.goals(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  -- Statut stocké : 'planned' | 'completed' | 'postponed'. « En cours » et « En retard » sont dérivés (voir vue tasks_with_status).
  status text not null default 'planned' check (status in ('planned','completed','postponed')),
  completed_at timestamptz,
  recurrence_rule text,                           -- ex. RRULE simplifiée : FREQ=DAILY;COUNT=10
  recurrence_parent_id uuid references public.tasks(id) on delete cascade,
  occurrence_key text,                            -- anti-doublons des occurrences récurrentes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index tasks_user_time_idx on public.tasks(user_id, start_at);
create unique index tasks_occurrence_uniq on public.tasks(user_id, recurrence_parent_id, occurrence_key)
  where recurrence_parent_id is not null;

-- Statut calculé côté base : indépendant d'un minuteur navigateur.
create view public.tasks_with_status with (security_invoker = true) as
select t.*,
  case
    when t.status = 'completed' then 'completed'
    when t.status = 'postponed' then 'postponed'
    when now() >= t.end_at then 'overdue'
    when now() >= t.start_at then 'in_progress'
    else 'upcoming'
  end as effective_status
from public.tasks t;

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null,                             -- created | completed | uncompleted | postponed | edited | deleted
  at timestamptz not null default now(),
  details jsonb
);
create index task_history_task_idx on public.task_history(task_id);

-- ───────────────────────── Finances ─────────────────────────
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  currency text not null default 'MAD',
  starting_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  currency text not null default 'MAD',
  target_amount numeric(14,2) not null check (target_amount > 0),
  starting_amount numeric(14,2) not null default 0 check (starting_amount >= 0), -- compté une seule fois
  deadline date,
  created_at timestamptz not null default now()
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'MAD',
  occurred_on date not null,
  category text not null,
  source text,
  description text,
  is_business boolean not null default false,
  recurrence_rule text,
  idempotency_key text,                             -- évite le double traitement d'une même opération
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fin_tx_user_date_idx on public.financial_transactions(user_id, occurred_on);
create unique index fin_tx_idem_uniq on public.financial_transactions(user_id, idempotency_key) where idempotency_key is not null;

create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  savings_goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(14,2) not null check (amount <> 0),  -- négatif = retrait
  occurred_on date not null,
  note text,
  idempotency_key text,
  created_at timestamptz not null default now()
);
create index savings_contrib_goal_idx on public.savings_contributions(savings_goal_id, occurred_on);
create unique index savings_idem_uniq on public.savings_contributions(user_id, idempotency_key) where idempotency_key is not null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text,                                    -- null = budget mensuel global
  currency text not null default 'MAD',
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  alert_threshold int not null default 80 check (alert_threshold between 1 and 100),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Suivi : études, sport, sommeil, habitudes ─────────────────────────
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  started_at timestamptz not null,
  minutes int not null check (minutes > 0),
  notes text,
  goal_id uuid references public.goals(id) on delete set null
);
create index study_user_idx on public.study_sessions(user_id, started_at);

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  started_at timestamptz not null,
  minutes int not null check (minutes > 0),
  planned boolean not null default false,
  completed boolean not null default true,
  notes text
);
create index exercise_user_idx on public.exercise_sessions(user_id, started_at);

create table public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  night_of date not null,                           -- date du coucher
  intended_bed time,
  intended_wake time,
  recorded_bed_at timestamptz,
  recorded_wake_at timestamptz,
  source text not null default 'manual' check (source in ('manual','estimated')),
  unique (user_id, night_of),
  check (recorded_wake_at is null or recorded_bed_at is null or recorded_wake_at > recorded_bed_at)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  frequency text not null default 'daily' check (frequency in ('daily','weekly','custom')),
  target_per_period int not null default 1 check (target_per_period > 0),
  weekdays int[],
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  done_on date not null,
  unique (habit_id, done_on)
);

-- ───────────────────────── Compétences ─────────────────────────
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  current_level int not null default 1 check (current_level between 1 and 10),  -- auto-évalué
  target_level int not null default 5 check (target_level between 1 and 10),
  start_date date not null default current_date,
  target_date date,
  resources text[],
  notes text,
  evidence text[],                                  -- preuves de réalisation (liens, certificats…)
  created_at timestamptz not null default now()
);

create table public.skill_activities (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurred_on date not null,
  minutes int not null check (minutes > 0),
  notes text
);

-- ───────────────────────── Notifications & IA ─────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  dedupe_key text
);
create unique index notifications_dedupe_uniq on public.notifications(user_id, dedupe_key) where dedupe_key is not null;

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null check (period in ('day','week','month')),
  period_start date not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  used_on date not null default current_date,
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now()
);
create index ai_usage_user_day_idx on public.ai_usage(user_id, used_on);

create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  at timestamptz not null default now()
);

-- ───────────────────────── Création automatique du profil ─────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
          coalesce(new.raw_user_meta_data->>'last_name',  new.raw_user_meta_data->>'family_name', ''));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Modèles d'objectifs par défaut ─────────────────────────
insert into public.goal_templates (category, name, target_value, unit, period, calc_method) values
 ('Études', 'Étudier 2 heures par jour', 120, 'minutes', 'day', 'duration'),
 ('Sport', 'Faire du sport 3 fois par semaine', 3, 'séances', 'week', 'count'),
 ('Finance', 'Épargner 1 000 DH ce mois-ci', 1000, 'MAD', 'month', 'financial'),
 ('Finance', 'Gagner 10 000 DH ce mois-ci', 10000, 'MAD', 'month', 'financial'),
 ('Travail', 'Terminer 5 tâches par jour', 5, 'tâches', 'day', 'count'),
 ('Compétences', 'Apprendre 20 mots de vocabulaire par semaine', 20, 'mots', 'week', 'count'),
 ('Projets personnels', 'Terminer un projet personnel en 30 jours', 30, 'jours', 'custom', 'custom'),
 ('Sommeil', 'Garder une heure de coucher régulière', 7, 'nuits', 'week', 'count');
