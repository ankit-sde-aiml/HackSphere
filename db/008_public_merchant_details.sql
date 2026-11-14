-- Whitelisted public merchant information for policy and onboarding pages.
-- Does not expose private site_settings, billing secrets or administrators' private emails.
create or replace function public.get_hacksphere_public_business()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(
 (select jsonb_build_object(
 'business_name',left(coalesce(value->>'business_name',''),200),
 'legal_entity_type',left(coalesce(value->>'legal_entity_type',''),100),
 'support_email',left(coalesce(value->>'support_email',''),254),
 'support_phone',left(coalesce(value->>'support_phone',''),35),
 'address',left(coalesce(value->>'address',''),1000),
 'support_hours',left(coalesce(value->>'support_hours',''),200),
 'refund_policy',left(coalesce(value->>'refund_policy',''),6000),
 'privacy_contact',left(coalesce(value->>'privacy_contact',''),254))
 from public.site_settings where key='legal_business'),'{}'::jsonb)
$$;
revoke all on function public.get_hacksphere_public_business() from public;
grant execute on function public.get_hacksphere_public_business() to anon,authenticated;
