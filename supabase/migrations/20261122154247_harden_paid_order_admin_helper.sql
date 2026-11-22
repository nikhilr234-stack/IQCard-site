-- PUBLIC grants are inherited even after an explicit anon revoke.
-- Preserve the authenticated RLS helper and server access, without anonymous execution.
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated, service_role;
