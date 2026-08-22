-- Client establishment stats: add approved_at and submission website
-- to the owner-scoped RPC so the frontend can compute renewal dates
-- and profile completeness without exposing internal IDs or admin data.
--
-- Forward-only. No earlier migration is edited.
-- search_appearances remains null: linking search_logs to specific
-- establishments is not safe in V1 because the logs store queries,
-- not result IDs.

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
      'approved_at', submission.approved_at,
      'subscription_amount_mro', submission.amount_mro,
      'subscription_period_months', submission.period_months,
      'submission_website', submission.website,
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
      select submission.amount_mro, submission.period_months,
        submission.approved_at, submission.website
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
