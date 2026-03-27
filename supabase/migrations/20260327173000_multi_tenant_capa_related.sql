alter table capa.capa_comments
  add column if not exists organization_id uuid references core.organizations(id);

alter table capa.capa_status_history
  add column if not exists organization_id uuid references core.organizations(id);

alter table capa.capa_action_status_history
  add column if not exists organization_id uuid references core.organizations(id);

create index if not exists idx_capa_comments_org on capa.capa_comments(organization_id);
create index if not exists idx_capa_status_history_org on capa.capa_status_history(organization_id);
create index if not exists idx_capa_action_status_history_org on capa.capa_action_status_history(organization_id);

alter table capa.capa_comments enable row level security;
alter table capa.capa_status_history enable row level security;
alter table capa.capa_action_status_history enable row level security;

drop policy if exists capa_comments_org_isolation on capa.capa_comments;
create policy capa_comments_org_isolation on capa.capa_comments
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  );

drop policy if exists capa_status_history_org_isolation on capa.capa_status_history;
create policy capa_status_history_org_isolation on capa.capa_status_history
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  );

drop policy if exists capa_action_status_history_org_isolation on capa.capa_action_status_history;
create policy capa_action_status_history_org_isolation on capa.capa_action_status_history
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.id = auth.uid()
    )
  );

