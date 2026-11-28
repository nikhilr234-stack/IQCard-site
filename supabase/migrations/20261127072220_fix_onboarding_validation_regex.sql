-- Fix the doubled PostgreSQL regex escapes present in some deployed databases.
-- Databases already running the corrected publication validator need no change.
do $fix$
declare
  original text;
  corrected text;
  slash text := pg_catalog.chr(92);
begin
  select pg_catalog.pg_get_functiondef('public.assert_own_onboarding_prerequisites(uuid,text)'::regprocedure) into strict original;
  corrected := pg_catalog.replace(original, slash || slash || 's+', '[[:space:]]+');
  corrected := pg_catalog.replace(corrected, slash || slash || '.', '[.]');
  if corrected <> original then
    execute corrected;
  end if;
end
$fix$;
