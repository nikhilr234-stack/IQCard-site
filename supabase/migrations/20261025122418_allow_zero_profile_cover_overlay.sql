do $migration$
declare
  definition text := pg_get_functiondef('public.save_own_profile_presentation(jsonb)'::regprocedure);
begin
  if position('not between 0.15 and 0.70' in definition) = 0 then
    raise exception 'Unexpected overlay validation; refusing to modify function';
  end if;
  execute replace(definition, 'not between 0.15 and 0.70', 'not between 0 and 0.70');
end;
$migration$;
