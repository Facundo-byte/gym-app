begin;

-- One atomic document per owner preserves the existing service's transaction boundary.
create table public.forge_documents (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  document jsonb not null,
  guest_import_hash text,
  updated_at timestamptz not null default now()
);
alter table public.forge_documents enable row level security;
revoke all on public.forge_documents from anon, authenticated;
grant select on public.forge_documents to authenticated;
create policy "Read own FORGE document" on public.forge_documents
  for select to authenticated using ((select auth.uid()) = owner_id);

create function public.forge_valid_targets(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value->'sets') = 'number'
    and jsonb_typeof(value->'reps') = 'number'
    and jsonb_typeof(value->'targetWeight') = 'number'
    and (value->>'sets')::numeric >= 1 and trunc((value->>'sets')::numeric) = (value->>'sets')::numeric
    and (value->>'reps')::numeric >= 1 and trunc((value->>'reps')::numeric) = (value->>'reps')::numeric
    and (value->>'targetWeight')::numeric >= 0;
$$;

create function public.forge_valid_date(value text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  return value ~ '^\d{4}-\d{2}-\d{2}$' and to_char(value::date, 'YYYY-MM-DD') = value;
exception when others then return false;
end;
$$;

create function public.forge_validate_document(value jsonb, owner uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
declare exercise jsonb; routine jsonb; day jsonb; assignment jsonb; log jsonb;
begin
  if (jsonb_typeof(value) = 'object' and value->'schemaVersion' = '1'::jsonb
    and (value ? 'trackingStartedOn')
    and (value->'trackingStartedOn' = 'null'::jsonb or public.forge_valid_date(value->>'trackingStartedOn'))
    and octet_length(value::text) <= 3145728) is not true then return false; end if;
  if (jsonb_typeof(value->'exercises') = 'array' and jsonb_typeof(value->'routines') = 'array'
    and jsonb_typeof(value->'weeklySchedules') = 'array' and jsonb_typeof(value->'workoutLogs') = 'array') is not true then return false; end if;
  for exercise in select * from jsonb_array_elements(value->'exercises') loop
    if (jsonb_typeof(exercise->'id') = 'string' and trim(exercise->>'id') <> ''
      and jsonb_typeof(exercise->'name') = 'string' and trim(exercise->>'name') <> ''
      and jsonb_typeof(exercise->'muscle') = 'string' and trim(exercise->>'muscle') <> '') is not true then return false; end if;
    if exercise->'image' is not null and exercise->'image' <> 'null'::jsonb
      and (jsonb_typeof(exercise->'image') = 'object'
        and exercise->'image'->>'path' ~ ('^' || owner::text || '/[a-f0-9]{64}\.(png|jpeg)$')) is not true then return false; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(value->'exercises') e group by e->>'id' having count(*) > 1)
    or exists (select 1 from jsonb_array_elements(value->'routines') r group by r->>'id' having count(*) > 1) then return false; end if;
  for routine in select * from jsonb_array_elements(value->'routines') loop
    if (jsonb_typeof(routine->'id') = 'string' and trim(routine->>'id') <> ''
      and jsonb_typeof(routine->'name') = 'string' and trim(routine->>'name') <> ''
      and public.forge_valid_date(routine->>'createdOn') and jsonb_typeof(routine->'days') = 'array'
      and jsonb_array_length(routine->'days') >= 1) is not true then return false; end if;
    if exists (select 1 from jsonb_array_elements(routine->'days') d group by d->'dayOfWeek' having count(*) > 1) then return false; end if;
    for day in select * from jsonb_array_elements(routine->'days') loop
      if (day->'dayOfWeek' <@ '[1,2,3,4,5,6,7]'::jsonb and jsonb_typeof(day->'assignments') = 'array') is not true then return false; end if;
      for assignment in select * from jsonb_array_elements(day->'assignments') loop
        if coalesce(trim(assignment->>'id'), '') = '' or coalesce(trim(assignment->>'exerciseId'), '') = ''
          or public.forge_valid_targets(assignment) is not true then return false; end if;
      end loop;
    end loop;
  end loop;
  if exists (select 1 from jsonb_array_elements(value->'routines') r,
    lateral jsonb_array_elements(r->'days') d, lateral jsonb_array_elements(d->'assignments') a
    group by a->>'id' having count(*) > 1) then return false; end if;
  for log in select * from jsonb_array_elements(value->'workoutLogs') loop
    if coalesce(trim(log->>'id'), '') = '' or coalesce(trim(log->>'routineId'), '') = ''
      or (log->>'status' = 'completed' and public.forge_valid_date(log->>'date')) is not true
      or (log->>'completedAt')::timestamptz is null
      or log->'snapshot'->>'routineId' is distinct from log->>'routineId'
      or log->'snapshot'->>'date' is distinct from log->>'date'
      or coalesce(trim(log->'snapshot'->>'routineName'), '') = ''
      or (jsonb_typeof(log->'snapshot'->'exercises') = 'array') is not true
      or jsonb_array_length(log->'snapshot'->'exercises') < 1 then return false; end if;
    for exercise in select * from jsonb_array_elements(log->'snapshot'->'exercises') loop
      if coalesce(trim(exercise->>'assignmentId'), '') = '' or coalesce(trim(exercise->>'exerciseId'), '') = ''
        or coalesce(trim(exercise->>'name'), '') = '' or coalesce(trim(exercise->>'muscle'), '') = ''
        or exercise ? 'image' or public.forge_valid_targets(exercise) is not true then return false; end if;
    end loop;
  end loop;
  if exists (select 1 from jsonb_array_elements(value->'workoutLogs') l group by l->>'id' having count(*) > 1)
    or exists (select 1 from jsonb_array_elements(value->'workoutLogs') l group by l->>'routineId', l->>'date' having count(*) > 1)
    or exists (select 1 from jsonb_array_elements(value->'weeklySchedules') w group by w->>'weekStart' having count(*) > 1) then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create function public.forge_pristine_document(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_array_length(value->'routines') = 0 and jsonb_array_length(value->'workoutLogs') = 0
    and not exists (select 1 from jsonb_array_elements(value->'weeklySchedules') w,
      lateral jsonb_array_elements(w->'days') d where jsonb_array_length(d->'occurrences') > 0)
    and jsonb_array_length(value->'exercises') in (0, 9)
    and not exists (
      select 1 from jsonb_array_elements(value->'exercises') e
      where e->'image' is not null and e->'image' <> 'null'::jsonb
        or not exists (select 1 from (values
          ('exercise-bench-press','Bench Press','Chest'), ('exercise-lat-pulldown','Lat Pulldown','Back'),
          ('exercise-squat','Squat','Legs'), ('exercise-lateral-raise','Lateral Raise','Shoulders'),
          ('exercise-biceps-curl','Biceps Curl','Biceps'), ('exercise-triceps-pushdown','Triceps Pushdown','Triceps'),
          ('exercise-incline-dumbbell-press','Incline Dumbbell Press','Chest'),
          ('exercise-romanian-deadlift','Romanian Deadlift','Legs'), ('exercise-cable-row','Cable Row','Back')
        ) s(id,name,muscle) where s.id = e->>'id' and s.name = e->>'name' and s.muscle = e->>'muscle')
    );
$$;

-- Browser roles have no direct writes. This narrow RPC always derives ownership from auth.uid().
create function public.forge_save_document(p_document jsonb, p_expected_revision bigint, p_import_hash text default null)
returns table(owner_id uuid, revision bigint, document jsonb, guest_import_hash text)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_row public.forge_documents%rowtype;
begin
  if actor is null then raise exception 'FORGE_AUTH_REQUIRED' using errcode = '42501'; end if;
  if public.forge_validate_document(p_document, actor) is not true then
    raise exception 'FORGE_INVALID_DOCUMENT' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select d.* into current_row from public.forge_documents d where d.owner_id = actor for update;
  if p_import_hash is not null then
    if p_import_hash !~ '^[a-f0-9]{64}$' then raise exception 'FORGE_INVALID_IMPORT' using errcode = '22023'; end if;
    if current_row.guest_import_hash = p_import_hash then
      return query select d.owner_id,d.revision,d.document,d.guest_import_hash from public.forge_documents d where d.owner_id = actor;
      return;
    end if;
    if current_row.owner_id is not null and (current_row.guest_import_hash is not null or public.forge_pristine_document(current_row.document) is not true) then
      raise exception 'FORGE_IMPORT_NOT_EMPTY' using errcode = 'P0003'; end if;
  end if;
  if coalesce(current_row.revision, 0) is distinct from p_expected_revision then
    raise exception 'FORGE_CONFLICT' using errcode = 'P0001'; end if;
  insert into public.forge_documents as d(owner_id, revision, document, guest_import_hash)
    values(actor, 1, p_document, p_import_hash)
    on conflict on constraint forge_documents_pkey do update set
      revision = d.revision + 1, document = excluded.document,
      guest_import_hash = coalesce(d.guest_import_hash, excluded.guest_import_hash), updated_at = now();
  return query select d.owner_id,d.revision,d.document,d.guest_import_hash from public.forge_documents d where d.owner_id = actor;
end;
$$;

revoke all on function public.forge_valid_targets(jsonb), public.forge_valid_date(text),
  public.forge_validate_document(jsonb,uuid), public.forge_pristine_document(jsonb),
  public.forge_save_document(jsonb,bigint,text) from public, anon, authenticated;
grant execute on function public.forge_save_document(jsonb,bigint,text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values('forge-exercise-images', 'forge-exercise-images', false, 262144, array['image/png','image/jpeg']);
create policy "Read own FORGE images" on storage.objects for select to authenticated
  using (bucket_id = 'forge-exercise-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own immutable FORGE images" on storage.objects for insert to authenticated
  with check (bucket_id = 'forge-exercise-images' and name ~ ('^' || (select auth.uid())::text || '/[a-f0-9]{64}\.(png|jpeg)$'));

commit;
