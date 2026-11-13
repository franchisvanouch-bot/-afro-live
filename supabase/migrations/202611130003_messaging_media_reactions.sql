begin;
alter table public.dm_messages
 add column if not exists message_type text not null default 'text',
 add column if not exists media_path text,
 add column if not exists media_mime text,
 add column if not exists duration_seconds integer,
 add column if not exists reply_to_id uuid references public.dm_messages(id) on delete set null,
 add column if not exists shared_post_id uuid,
 add column if not exists shared_live_session_id uuid;
alter table public.dm_messages drop constraint if exists dm_messages_message_type_check;
alter table public.dm_messages add constraint dm_messages_message_type_check check(message_type in ('text','image','video','audio','post','live'));
alter table public.dm_messages drop constraint if exists dm_messages_body_check;
alter table public.dm_messages add constraint dm_messages_body_check check(char_length(body) between 0 and 2000 and (message_type<>'text' or char_length(body)>=1));
create table if not exists public.dm_message_reactions(
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.dm_messages(id) on delete cascade,
 conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 emoji text not null check(emoji in ('❤️','😂','😭','👍','😮','🔥','👏')),
 created_at timestamptz not null default now(),
 unique(message_id,user_id)
);
alter table public.dm_message_reactions enable row level security;
drop policy if exists "dm members read reactions" on public.dm_message_reactions;
drop policy if exists "dm members add own reactions" on public.dm_message_reactions;
drop policy if exists "dm users remove own reactions" on public.dm_message_reactions;
create policy "dm members read reactions" on public.dm_message_reactions for select to authenticated using(public.dm_is_member(conversation_id));
create policy "dm members add own reactions" on public.dm_message_reactions for insert to authenticated with check(user_id=auth.uid() and public.dm_is_member(conversation_id) and exists(select 1 from public.dm_messages m where m.id=dm_message_reactions.message_id and m.conversation_id=dm_message_reactions.conversation_id));
create policy "dm users remove own reactions" on public.dm_message_reactions for delete to authenticated using(user_id=auth.uid() and public.dm_is_member(conversation_id));
grant select,insert,delete on public.dm_message_reactions to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dm_message_reactions') then alter publication supabase_realtime add table public.dm_message_reactions; end if; end $$;
commit;