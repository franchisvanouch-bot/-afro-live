revoke all on function public.dm_is_member(uuid) from public,anon;
grant execute on function public.dm_is_member(uuid) to authenticated;
revoke all on function public.dm_update_conversation_after_message() from public,anon,authenticated;
grant select on public.dm_messages,public.dm_message_reactions to authenticated;
grant insert,update,delete on public.dm_messages to authenticated;
grant select,insert,delete on public.dm_message_reactions to authenticated;