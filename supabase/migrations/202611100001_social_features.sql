-- AFRO LIVE social expansion (additive; keeps existing profiles, posts, payments and LiveKit tables)
-- Adapted to AFRO LIVE's creator_id / spectator_id / post_comments schema.
create table if not exists public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.post_saves enable row level security;
drop policy if exists "afro saves read own" on public.post_saves;
create policy "afro saves read own" on public.post_saves for select using (auth.uid() = user_id);
drop policy if exists "afro saves insert own" on public.post_saves;
create policy "afro saves insert own" on public.post_saves for insert with check (auth.uid() = user_id);
drop policy if exists "afro saves delete own" on public.post_saves;
create policy "afro saves delete own" on public.post_saves for delete using (auth.uid() = user_id);

alter table public.post_comments add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;
alter table public.post_comments add column if not exists likes_count integer not null default 0;
alter table public.post_comments add column if not exists replies_count integer not null default 0;
create index if not exists post_comments_parent_idx on public.post_comments(parent_id, created_at);

create or replace function public.afro_check_comment_parent()
returns trigger language plpgsql set search_path = public as $$
declare parent_post uuid; parent_parent uuid;
begin
  if new.parent_id is null then return new; end if;
  select post_id, parent_id into parent_post, parent_parent from public.post_comments where id = new.parent_id;
  if parent_post is null or parent_post <> new.post_id then raise exception 'Invalid reply target'; end if;
  if parent_parent is not null then new.parent_id := parent_parent; end if;
  return new;
end $$;
drop trigger if exists afro_comment_parent_check on public.post_comments;
create trigger afro_comment_parent_check before insert on public.post_comments
for each row execute function public.afro_check_comment_parent();

create table if not exists public.post_comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, comment_id)
);
alter table public.post_comment_likes enable row level security;
drop policy if exists "afro comment likes read" on public.post_comment_likes;
create policy "afro comment likes read" on public.post_comment_likes for select using (true);
drop policy if exists "afro comment likes insert own" on public.post_comment_likes;
create policy "afro comment likes insert own" on public.post_comment_likes for insert with check (auth.uid() = user_id);
drop policy if exists "afro comment likes delete own" on public.post_comment_likes;
create policy "afro comment likes delete own" on public.post_comment_likes for delete using (auth.uid() = user_id);

create or replace function public.afro_comment_like_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.post_comments set likes_count = likes_count + 1 where id = new.comment_id;
  else
    update public.post_comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;
drop trigger if exists afro_comment_like_counter on public.post_comment_likes;
create trigger afro_comment_like_counter after insert or delete on public.post_comment_likes
for each row execute function public.afro_comment_like_counter();

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists "afro blocks read own" on public.user_blocks;
create policy "afro blocks read own" on public.user_blocks for select using (auth.uid() = blocker_id);
drop policy if exists "afro blocks delete own" on public.user_blocks;
create policy "afro blocks delete own" on public.user_blocks for delete using (auth.uid() = blocker_id);

create or replace function public.afro_is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.afro_block_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then raise exception 'Invalid account'; end if;
  insert into public.user_blocks(blocker_id, blocked_id) values(auth.uid(), p_user) on conflict do nothing;
  delete from public.follows
   where (spectator_id = auth.uid() and creator_id = p_user)
      or (spectator_id = p_user and creator_id = auth.uid());
end $$;

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.post_comments(id) on delete set null,
  reason text not null check (reason in ('spam','harassment','hate','nudity','violence','scam','other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','actioned')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(reported_user_id, post_id, comment_id) >= 1)
);
alter table public.social_reports enable row level security;
drop policy if exists "afro file social reports" on public.social_reports;
create policy "afro file social reports" on public.social_reports for insert with check (auth.uid() = reporter_id);
-- Reports are intentionally not readable by ordinary users. Moderation reads them through the trusted admin backend.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default ''
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);
create index if not exists afro_conversation_members_user_idx on public.conversation_members(user_id);
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 2000),
  shared_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  check (coalesce(char_length(body), 0) > 0 or shared_post_id is not null)
);
create index if not exists afro_direct_messages_conversation_idx on public.direct_messages(conversation_id, created_at desc);

create or replace function public.afro_is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_members where conversation_id = p_conversation and user_id = auth.uid());
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages enable row level security;
drop policy if exists "afro members read conversations" on public.conversations;
create policy "afro members read conversations" on public.conversations for select using (public.afro_is_conversation_member(id));
drop policy if exists "afro members read members" on public.conversation_members;
create policy "afro members read members" on public.conversation_members for select using (public.afro_is_conversation_member(conversation_id));
drop policy if exists "afro members read messages" on public.direct_messages;
create policy "afro members read messages" on public.direct_messages for select using (public.afro_is_conversation_member(conversation_id));
drop policy if exists "afro members send messages" on public.direct_messages;
create policy "afro members send messages" on public.direct_messages for insert with check (
  sender_id = auth.uid()
  and public.afro_is_conversation_member(conversation_id)
  and not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = direct_messages.conversation_id
      and m.user_id <> auth.uid()
      and public.afro_is_blocked_between(auth.uid(), m.user_id)
  )
);
drop policy if exists "afro delete own messages" on public.direct_messages;
create policy "afro delete own messages" on public.direct_messages for delete using (sender_id = auth.uid());

create or replace function public.afro_start_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or p_other is null or p_other = auth.uid() then raise exception 'Invalid conversation'; end if;
  if public.afro_is_blocked_between(auth.uid(), p_other) then raise exception 'Messaging is unavailable for this account'; end if;
  select a.conversation_id into cid
    from public.conversation_members a
    join public.conversation_members b on b.conversation_id = a.conversation_id and b.user_id = p_other
   where a.user_id = auth.uid()
     and (select count(*) from public.conversation_members x where x.conversation_id = a.conversation_id) = 2
   limit 1;
  if cid is null then
    insert into public.conversations default values returning id into cid;
    insert into public.conversation_members(conversation_id,user_id)
      values(cid,auth.uid()),(cid,p_other);
  end if;
  return cid;
end $$;

create or replace function public.afro_mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = public as $$
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation and user_id = auth.uid();
$$;

create or replace function public.afro_on_direct_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = case when new.shared_post_id is not null and coalesce(new.body,'') = '' then 'Publication partagée' else left(new.body,120) end
   where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end $$;
drop trigger if exists afro_direct_message_insert on public.direct_messages;
create trigger afro_direct_message_insert after insert on public.direct_messages
for each row execute function public.afro_on_direct_message_insert();

create or replace view public.afro_my_conversations with (security_invoker = true) as
select c.id, c.last_message_at, c.last_message_preview,
       other.user_id as other_id,
       p.username as other_username,
       p.display_name as other_display_name,
       p.avatar_url as other_avatar_url,
       (select count(*) from public.direct_messages m
         where m.conversation_id = c.id and m.sender_id <> auth.uid()
           and m.created_at > me.last_read_at)::int as unread_count
  from public.conversations c
  join public.conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_members other on other.conversation_id = c.id and other.user_id <> auth.uid()
  join public.profiles p on p.id = other.user_id
 where exists(select 1 from public.direct_messages m where m.conversation_id = c.id);

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
