-- AFRO LIVE messaging v2: reset old direct-message history and install a clean schema.
begin;
delete from public.direct_message_reactions;
delete from public.direct_message_hidden_for_user;
delete from public.direct_messages;
delete from public.conversation_members;
delete from public.conversations;
create table if not exists public.dm_conversations (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 last_message_at timestamptz not null default now(),
 last_message_preview text not null default ''
);
create table if not exists public.dm_members (
 conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 last_read_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
create index if not exists dm_members_user_idx on public.dm_members(user_id);
create table if not exists public.dm_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now(),
 edited_at timestamptz
);
create index if not exists dm_messages_conversation_created_idx on public.dm_messages(conversation_id,created_at);
create or replace function public.dm_is_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.dm_members where conversation_id=p_conversation and user_id=auth.uid());
$$;
create or replace function public.dm_start_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_me uuid:=auth.uid(); v_id uuid;
begin
 if v_me is null or p_other is null or p_other=v_me then raise exception 'Compte de conversation invalide'; end if;
 if not exists(select 1 from public.profiles where id=p_other) then raise exception 'Ce profil est introuvable'; end if;
 if public.afro_is_blocked_between(v_me,p_other) then raise exception 'Cette conversation n’est pas disponible'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(v_me::text,p_other::text)||':'||greatest(v_me::text,p_other::text),0));
 select a.conversation_id into v_id from public.dm_members a join public.dm_members b on b.conversation_id=a.conversation_id
 where a.user_id=v_me and b.user_id=p_other
 and (select count(*) from public.dm_members x where x.conversation_id=a.conversation_id)=2 limit 1;
 if v_id is null then
  insert into public.dm_conversations default values returning id into v_id;
  insert into public.dm_members(conversation_id,user_id) values(v_id,v_me),(v_id,p_other);
 end if;
 return v_id;
end;
$$;
create or replace function public.dm_mark_read(p_conversation uuid)
returns void language plpgsql security definer set search_path=public as $$
begin update public.dm_members set last_read_at=now() where conversation_id=p_conversation and user_id=auth.uid(); end;
$$;
create or replace function public.dm_update_conversation_after_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.dm_conversations set last_message_at=new.created_at,last_message_preview=left(new.body,120) where id=new.conversation_id;
 update public.dm_members set last_read_at=new.created_at where conversation_id=new.conversation_id and user_id=new.sender_id;
 return new;
end;
$$;
drop trigger if exists dm_message_inserted on public.dm_messages;
create trigger dm_message_inserted after insert on public.dm_messages for each row execute function public.dm_update_conversation_after_message();
alter table public.dm_conversations enable row level security;
alter table public.dm_members enable row level security;
alter table public.dm_messages enable row level security;
create policy "dm members can read conversations" on public.dm_conversations for select using(public.dm_is_member(id));
create policy "dm members can read member rows" on public.dm_members for select using(public.dm_is_member(conversation_id));
create policy "dm members can read messages" on public.dm_messages for select using(public.dm_is_member(conversation_id));
create policy "dm members can send messages" on public.dm_messages for insert with check(sender_id=auth.uid() and public.dm_is_member(conversation_id) and not exists(select 1 from public.dm_members m where m.conversation_id=dm_messages.conversation_id and m.user_id<>auth.uid() and public.afro_is_blocked_between(auth.uid(),m.user_id)));
create policy "dm senders can edit own messages" on public.dm_messages for update using(sender_id=auth.uid() and public.dm_is_member(conversation_id)) with check(sender_id=auth.uid() and public.dm_is_member(conversation_id));
create policy "dm senders can delete own messages" on public.dm_messages for delete using(sender_id=auth.uid() and public.dm_is_member(conversation_id));
grant select on public.dm_conversations,public.dm_members,public.dm_messages to authenticated;
grant insert,update,delete on public.dm_messages to authenticated;
revoke all on function public.dm_start_conversation(uuid) from public,anon;
revoke all on function public.dm_mark_read(uuid) from public,anon;
grant execute on function public.dm_start_conversation(uuid),public.dm_mark_read(uuid),public.dm_is_member(uuid) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dm_messages') then alter publication supabase_realtime add table public.dm_messages; end if;
end $$;
commit;