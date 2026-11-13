create or replace function public.dm_update_conversation_after_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_preview text;
begin
 v_preview:=case new.message_type
  when 'image' then '📷 Photo'
  when 'video' then '🎥 Vidéo'
  when 'audio' then '🎙 Note vocale'
  when 'post' then 'Publication partagée'
  when 'live' then 'Direct partagé'
  else left(new.body,120)
 end;
 update public.dm_conversations set last_message_at=new.created_at,last_message_preview=v_preview where id=new.conversation_id;
 update public.dm_members set last_read_at=new.created_at where conversation_id=new.conversation_id and user_id=new.sender_id;
 return new;
end;
$$;
revoke all on function public.dm_update_conversation_after_message() from public,anon,authenticated;