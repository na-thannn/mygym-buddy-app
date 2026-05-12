
-- =========================================================
-- ROLES
-- =========================================================
create type public.app_role as enum ('admin', 'pt', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_user_role()
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles
  where user_id = auth.uid()
  order by case role when 'admin' then 1 when 'pt' then 2 else 3 end
  limit 1
$$;

create policy "user_roles self read" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "user_roles admin manage" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  dob date,
  gender text,
  height_cm numeric,
  target_weight_kg numeric,
  goal text,
  bio text,
  branch text not null default 'HL Fitness - 303 Lê Thanh Nghị',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read all authed" on public.profiles for select to authenticated using (true);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- =========================================================
-- PT APPLICATIONS
-- =========================================================
create table public.pt_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending', -- pending|approved|rejected
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);
alter table public.pt_applications enable row level security;
create policy "pt_app self read" on public.pt_applications for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "pt_app self create" on public.pt_applications for insert with check (auth.uid() = user_id);
create policy "pt_app admin update" on public.pt_applications for update using (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- INBODY
-- =========================================================
create table public.inbody_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  skeletal_muscle_kg numeric,
  bmi numeric,
  visceral_fat numeric,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.inbody_entries enable row level security;
create policy "inbody owner all" on public.inbody_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- LOGS
-- =========================================================
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  performed_at timestamptz not null default now(),
  exercise text not null,
  sets int,
  reps int,
  weight_kg numeric,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.workout_logs enable row level security;
create policy "workout owner all" on public.workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text, -- breakfast|lunch|dinner|snack
  name text not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  photo_url text,
  created_at timestamptz not null default now()
);
alter table public.meal_logs enable row level security;
create policy "meal owner all" on public.meal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- SOCIAL FEED
-- =========================================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  kind text not null default 'text', -- text|progress|pr
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts read authed" on public.posts for select to authenticated using (true);
create policy "posts owner insert" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts owner update" on public.posts for update using (auth.uid() = user_id);
create policy "posts owner delete" on public.posts for delete using (auth.uid() = user_id);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes read authed" on public.post_likes for select to authenticated using (true);
create policy "likes self insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes self delete" on public.post_likes for delete using (auth.uid() = user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;
create policy "comments read authed" on public.post_comments for select to authenticated using (true);
create policy "comments self insert" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments self delete" on public.post_comments for delete using (auth.uid() = user_id);

-- =========================================================
-- COACH / CHAT
-- =========================================================
create table public.coach_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'ai', -- ai|escalated|closed
  assigned_pt_id uuid references auth.users(id),
  escalated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_threads enable row level security;
create policy "thread owner read" on public.coach_threads for select using (
  auth.uid() = user_id
  or (public.has_role(auth.uid(),'pt') and status = 'escalated')
  or auth.uid() = assigned_pt_id
  or public.has_role(auth.uid(),'admin')
);
create policy "thread owner insert" on public.coach_threads for insert with check (auth.uid() = user_id);
create policy "thread owner update" on public.coach_threads for update using (
  auth.uid() = user_id or public.has_role(auth.uid(),'pt') or public.has_role(auth.uid(),'admin')
);

create trigger coach_threads_touch before update on public.coach_threads
  for each row execute function public.touch_updated_at();

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.coach_threads(id) on delete cascade,
  sender_role text not null, -- user|ai|pt
  sender_id uuid,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.coach_messages enable row level security;
create policy "messages read by thread participant" on public.coach_messages for select using (
  exists (
    select 1 from public.coach_threads t
    where t.id = thread_id
      and (
        t.user_id = auth.uid()
        or (public.has_role(auth.uid(),'pt') and t.status = 'escalated')
        or t.assigned_pt_id = auth.uid()
        or public.has_role(auth.uid(),'admin')
      )
  )
);
create policy "messages insert participant" on public.coach_messages for insert with check (
  exists (
    select 1 from public.coach_threads t
    where t.id = thread_id
      and (
        (sender_role = 'user' and t.user_id = auth.uid())
        or (sender_role = 'pt' and (public.has_role(auth.uid(),'pt') or public.has_role(auth.uid(),'admin')))
        or (sender_role = 'ai' and t.user_id = auth.uid()) -- AI msgs inserted server-side via user's session
      )
  )
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  plan jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.workout_plans enable row level security;
create policy "plan owner all" on public.workout_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.pt_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now()
);
alter table public.pt_presence enable row level security;
create policy "presence read authed" on public.pt_presence for select to authenticated using (true);
create policy "presence self upsert" on public.pt_presence for insert with check (auth.uid() = user_id and public.has_role(auth.uid(),'pt'));
create policy "presence self update" on public.pt_presence for update using (auth.uid() = user_id and public.has_role(auth.uid(),'pt'));

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public) values
  ('avatars','avatars', true),
  ('posts','posts', true),
  ('meals','meals', true),
  ('inbody','inbody', false)
on conflict (id) do nothing;

-- Public bucket read
create policy "public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public read posts" on storage.objects for select using (bucket_id = 'posts');
create policy "public read meals" on storage.objects for select using (bucket_id = 'meals');

-- Owner writes to their own folder (folder name = user id)
create policy "user upload avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "user update avatars" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "user delete avatars" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user upload posts" on storage.objects for insert
  with check (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "user delete posts" on storage.objects for delete
  using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user upload meals" on storage.objects for insert
  with check (bucket_id = 'meals' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "user delete meals" on storage.objects for delete
  using (bucket_id = 'meals' and auth.uid()::text = (storage.foldername(name))[1]);

-- InBody private to owner
create policy "owner read inbody" on storage.objects for select
  using (bucket_id = 'inbody' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner upload inbody" on storage.objects for insert
  with check (bucket_id = 'inbody' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner update inbody" on storage.objects for update
  using (bucket_id = 'inbody' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner delete inbody" on storage.objects for delete
  using (bucket_id = 'inbody' and auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================
-- REALTIME
-- =========================================================
alter publication supabase_realtime add table public.coach_threads;
alter publication supabase_realtime add table public.coach_messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.pt_presence;
