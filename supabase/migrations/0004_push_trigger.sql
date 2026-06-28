-- ============================================================================
-- 0004_push_trigger.sql — fire the notify-on-message Edge Function on every
-- new message, using pg_net to make a non-blocking async HTTP call.
-- ============================================================================
create extension if not exists pg_net;

create or replace function public.notify_new_message()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://gywqtcgitzjzcbwmeaka.supabase.co/functions/v1/notify-on-message',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('message_id', NEW.id)
  );
  return NEW;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- The trigger function is invoked by the trigger only — never as an RPC.
revoke execute on function public.notify_new_message() from public, anon, authenticated;
