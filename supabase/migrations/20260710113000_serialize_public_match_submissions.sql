create or replace function public.record_public_match_with_secret(
  p_club_slug text,
  p_player1_id uuid,
  p_player2_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_played_on date,
  p_source_key text,
  p_write_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
begin
  select app_secret.secret_hash
    into v_secret_hash
  from private.app_secrets as app_secret
  where app_secret.name = 'public_match_write';

  if v_secret_hash is null
    or p_write_secret is null
    or extensions.crypt(p_write_secret, v_secret_hash) <> v_secret_hash then
    raise exception using errcode = '42501', message = '경기 저장 권한을 확인하지 못했습니다.';
  end if;

  if p_source_key is null or btrim(p_source_key) = '' then
    raise exception using errcode = '22023', message = '제출 식별값이 필요합니다.';
  end if;

  -- The same browser submission can be retried concurrently. Serializing by
  -- club and source key makes every retry observe the first committed match.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      coalesce(p_club_slug, '') || ':' || p_source_key,
      0
    )
  );

  return public.record_public_match(
    p_club_slug,
    p_player1_id,
    p_player2_id,
    p_player1_score,
    p_player2_score,
    p_played_on,
    p_source_key
  );
end;
$$;

revoke execute on function public.record_public_match_with_secret(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text,
  text
) from public, authenticated;

grant execute on function public.record_public_match_with_secret(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text,
  text
) to anon, service_role;
