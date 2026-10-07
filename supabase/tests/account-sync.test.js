import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { createEmptyDocument } from '../../src/services/storage.js'
import { workoutHistory } from '../../src/services/testHelpers/workoutHistory.js'

const accountA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const accountB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('migration executes in PostgreSQL; owner RLS, narrow RPC, revision conflicts, import idempotency and private images', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  // Only Supabase's existing auth/storage scaffolding is supplied; application SQL is unmodified.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1]
    $$;
    insert into auth.users values ('${accountA}'),('${accountB}');
  `)
  await db.exec(await readFile(new URL('../migrations/202610070001_account_sync.sql', import.meta.url), 'utf8'))
  async function actor(id, role = 'authenticated') {
    await db.exec(`reset role; set role ${role};`)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
  }
  async function save(document, revision, hash = null) {
    return (await db.query('select * from public.forge_save_document($1::jsonb,$2::bigint,$3::text)', [JSON.stringify(document), revision, hash])).rows[0]
  }
  const empty = createEmptyDocument()
  await actor(null, 'anon')
  await assert.rejects(save(empty, 0), /permission denied/)
  await assert.rejects(db.query('select * from public.forge_documents'), /permission denied/)
  await actor(accountA)
  assert.equal((await save(empty, 0)).owner_id, accountA)
  const imported = { ...empty, ...workoutHistory(), exercises: [{ id: 'custom', name: 'Private A', muscle: 'Back', image: null }] }
  const hash = 'a'.repeat(64)
  assert.equal((await save(imported, 1, hash)).revision, 2)
  assert.equal((await save(imported, 1, hash)).revision, 2, 'lost-response retry does not duplicate or rewrite')
  const changed = structuredClone(imported)
  changed.exercises[0].name = 'A latest'
  assert.equal((await save(changed, 2)).revision, 3)
  assert.equal((await save(imported, 1, hash)).document.exercises[0].name, 'A latest', 'retry retains subsequent edits')
  await assert.rejects(save(imported, 2), /FORGE_CONFLICT/)
  await assert.rejects(save(imported, 3, 'b'.repeat(64)), /FORGE_IMPORT_NOT_EMPTY/)
  const duplicate = structuredClone(changed)
  duplicate.workoutLogs.push({ ...duplicate.workoutLogs[0], id: 'another-log' })
  await assert.rejects(save(duplicate, 3), /FORGE_INVALID_DOCUMENT/)
  for (const invalid of [{}, { ...empty, schemaVersion: 2 }, { ...empty, exercises: [{ id: 'x', name: 'X', muscle: 'Back', image: {} }] }]) await assert.rejects(save(invalid, 3), /FORGE_INVALID_DOCUMENT/)
  await assert.rejects(db.query('update public.forge_documents set revision=99'), /permission denied/)
  await assert.rejects(db.query('delete from public.forge_documents'), /permission denied/)
  const pathA = `${accountA}/${'c'.repeat(64)}.png`
  const pathB = `${accountB}/${'d'.repeat(64)}.png`
  await db.query('insert into storage.objects values($1,$2)', ['forge-exercise-images', pathA])
  await assert.rejects(db.query('insert into storage.objects values($1,$2)', ['forge-exercise-images', pathB]), /row-level security/)
  await actor(accountB)
  assert.equal((await db.query('select * from public.forge_documents')).rows.length, 0)
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0)
  assert.equal((await save(empty, 0)).owner_id, accountB)
  assert.equal((await db.query('select * from public.forge_documents where owner_id=$1', [accountA])).rows.length, 0)
  await assert.rejects(db.query('update public.forge_documents set document=$1 where owner_id=$2', [empty, accountA]), /permission denied/)
  const stolenImage = { ...empty, exercises: [{ id: 'x', name: 'X', muscle: 'Back', image: { path: pathA } }] }
  await assert.rejects(save(stolenImage, 1), /FORGE_INVALID_DOCUMENT/)
  await db.query('insert into storage.objects values($1,$2)', ['forge-exercise-images', pathB])
  assert.deepEqual((await db.query('select name from storage.objects')).rows.map((row) => row.name), [pathB])
  assert.equal((await db.query('update storage.objects set name=$1 returning name', [pathA])).rows.length, 0)
  assert.equal((await db.query('delete from storage.objects returning name')).rows.length, 0)
  await actor(accountA)
  assert.equal((await db.query('select document from public.forge_documents')).rows[0].document.exercises[0].name, 'A latest')
  assert.equal((await db.query('select document from public.forge_documents')).rows[0].document.workoutLogs.length, 1)
})
