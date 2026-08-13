-- Paste this into the SQL Editor. It reads the catalog directly, so it is
-- unaffected by the PostgREST schema cache and tells us what really exists.

select 'index_entries table' as object,
       count(*) as found
from information_schema.tables
where table_schema = 'public' and table_name = 'index_entries'

union all

select 'prompt_results.citations', count(*)
from information_schema.columns
where table_name = 'prompt_results' and column_name = 'citations'

union all

select 'index_entries.runs_per_prompt', count(*)
from information_schema.columns
where table_name = 'index_entries' and column_name = 'runs_per_prompt'

union all

select 'current database', 1
;

select current_database(), current_user, version();
