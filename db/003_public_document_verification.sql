-- HackSphere public verification for uniquely-issued offer letters and certificates.
alter table public.certificates add column if not exists issued_name text;
alter table public.enrollments add column if not exists offer_letter_name text;

create or replace function app_private.snapshot_credential_holder()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='certificates' then
   select coalesce(nullif(trim(p.full_name),''),p.email,'Student')
     into new.issued_name from public.profiles p where p.id=new.student_id;
   if new.issued_name is null then new.issued_name := 'Student'; end if;
 elsif tg_table_name='enrollments' then
   select coalesce(nullif(trim(p.full_name),''),p.email,'Student')
     into new.offer_letter_name from public.profiles p where p.id=new.student_id;
   if new.offer_letter_name is null then new.offer_letter_name := 'Student'; end if;
 end if;
 return new;
end $$;
drop trigger if exists hacksphere_cert_name on public.certificates;
create trigger hacksphere_cert_name before insert on public.certificates
for each row execute function app_private.snapshot_credential_holder();
drop trigger if exists hacksphere_letter_name on public.enrollments;
create trigger hacksphere_letter_name before insert on public.enrollments
for each row execute function app_private.snapshot_credential_holder();

create or replace function public.verify_hacksphere_document(document_code text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if document_code is null or length(document_code)>80 then return jsonb_build_object('valid',false); end if;
 select jsonb_build_object('valid',true,'kind','certificate','code',c.code,
 'holder_name',coalesce(c.issued_name,p.full_name,'Student'),'program',pr.title,
 'issued_at',c.issued_at,'status',c.status)
 into result
 from public.certificates c join public.programs pr on pr.id=c.program_id
 left join public.profiles p on p.id=c.student_id
 where c.code=document_code and c.status='approved';
 if result is not null then return result; end if;
 select jsonb_build_object('valid',true,'kind','offer_letter','code',e.offer_letter_code,
 'holder_name',coalesce(e.offer_letter_name,p.full_name,'Student'),
 'program',pr.title,'issued_at',e.approved_at,'status',e.status)
 into result
 from public.enrollments e join public.programs pr on pr.id=e.program_id
 left join public.profiles p on p.id=e.student_id
 where e.offer_letter_code=document_code and e.status in ('active','completed');
 return coalesce(result,jsonb_build_object('valid',false));
end $$;
revoke all on function public.verify_hacksphere_document(text) from public;
grant execute on function public.verify_hacksphere_document(text) to anon,authenticated;
