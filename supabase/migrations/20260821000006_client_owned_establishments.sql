-- Lewad client-owned establishments.
-- Ownership is copied from an approved DB4 submission, never from the approving admin.
-- The client read below is intentionally limited to the authenticated owner.

alter table public.establishments
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

create index if not exists establishments_owner_user_id_idx
on public.establishments (owner_user_id, status, created_at desc);

-- Historical ownership is backfilled only where the approved submission itself
-- explicitly resolves to the establishment. Unmatched rows remain untouched.
update public.establishments as establishment
set owner_user_id = submission.created_by
from public.business_submissions as submission
where submission.resolved_establishment_id = establishment.id
  and submission.status = 'approved'
  and establishment.owner_user_id is null;

create or replace function public.sync_business_submission_establishment_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.resolved_establishment_id is not null then
    update public.establishments
    set owner_user_id = new.created_by
    where id = new.resolved_establishment_id
      and owner_user_id is null;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_business_submission_establishment_owner() from public, anon, authenticated;

drop trigger if exists business_submission_sync_establishment_owner on public.business_submissions;
create trigger business_submission_sync_establishment_owner
after insert or update of status, resolved_establishment_id on public.business_submissions
for each row execute function public.sync_business_submission_establishment_owner();

create or replace function public.get_my_establishments_with_stats()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(item_data order by created_at desc), '[]'::jsonb)
  )
  from (
    select jsonb_build_object(
      'id', establishment.id,
      'name', establishment.name,
      'name_ar', establishment.name_ar,
      'category', category.name,
      'status', establishment.status,
      'is_verified', establishment.is_verified,
      'created_at', establishment.created_at,
      'verified_at', establishment.verified_at,
      'subscription_amount_mro', submission.amount_mro,
      'subscription_period_months', submission.period_months,
      'branch_count', (
        select count(*)
        from public.branches as branch
        where branch.establishment_id = establishment.id
          and branch.status = 'active'
      ),
      'search_appearances', null,
      'main_phone', main_branch.phone,
      'main_whatsapp', main_branch.whatsapp,
      'main_location', coalesce(main_branch.address, main_branch.neighborhood),
      'latitude', main_branch.latitude,
      'longitude', main_branch.longitude
    ) as item_data,
    establishment.created_at
    from public.establishments as establishment
    left join public.categories as category on category.id = establishment.category_id
    left join lateral (
      select branch.phone, branch.whatsapp, branch.address, branch.neighborhood,
        branch.latitude, branch.longitude
      from public.branches as branch
      where branch.establishment_id = establishment.id
        and branch.status = 'active'
      order by branch.is_main desc, branch.created_at asc
      limit 1
    ) as main_branch on true
    left join lateral (
      select submission.amount_mro, submission.period_months
      from public.business_submissions as submission
      where submission.resolved_establishment_id = establishment.id
        and submission.created_by = auth.uid()
        and submission.status = 'approved'
      order by submission.approved_at desc nulls last, submission.created_at desc
      limit 1
    ) as submission on true
    where establishment.owner_user_id = auth.uid()
      and establishment.status in ('approved', 'pending', 'rejected', 'suspended')
  ) as item;
$$;

revoke all on function public.get_my_establishments_with_stats() from public, anon;
grant execute on function public.get_my_establishments_with_stats() to authenticated;
