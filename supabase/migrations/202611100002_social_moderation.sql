-- AFRO LIVE social moderation and reply counters
create or replace function public.afro_comment_reply_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.post_comments set replies_count = replies_count + 1 where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update public.post_comments set replies_count = greatest(replies_count - 1, 0) where id = old.parent_id;
  end if;
  return null;
end $$;
drop trigger if exists afro_comment_reply_counter on public.post_comments;
create trigger afro_comment_reply_counter after insert or delete on public.post_comments
for each row execute function public.afro_comment_reply_counter();

drop policy if exists "afro admin read social reports" on public.social_reports;
create policy "afro admin read social reports" on public.social_reports for select
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "afro admin update social reports" on public.social_reports;
create policy "afro admin update social reports" on public.social_reports for update
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
