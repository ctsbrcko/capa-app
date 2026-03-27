create schema if not exists core;

create table if not exists core.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table core.users
  add column if not exists organization_id uuid references core.organizations(id);

alter table core.departments
  add column if not exists organization_id uuid references core.organizations(id);

alter table core.locations
  add column if not exists organization_id uuid references core.organizations(id);

alter table capa.capa_records
  add column if not exists organization_id uuid references core.organizations(id);

alter table capa.capa_actions
  add column if not exists organization_id uuid references core.organizations(id);

create index if not exists idx_core_users_org on core.users(organization_id);
create index if not exists idx_core_departments_org on core.departments(organization_id);
create index if not exists idx_core_locations_org on core.locations(organization_id);
create index if not exists idx_capa_records_org on capa.capa_records(organization_id);
create index if not exists idx_capa_actions_org on capa.capa_actions(organization_id);

alter table core.users enable row level security;
alter table core.departments enable row level security;
alter table core.locations enable row level security;
alter table capa.capa_records enable row level security;
alter table capa.capa_actions enable row level security;

drop policy if exists users_org_isolation on core.users;
create policy users_org_isolation on core.users
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

drop policy if exists departments_org_isolation on core.departments;
create policy departments_org_isolation on core.departments
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

drop policy if exists locations_org_isolation on core.locations;
create policy locations_org_isolation on core.locations
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

drop policy if exists capa_records_org_isolation on capa.capa_records;
create policy capa_records_org_isolation on capa.capa_records
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

drop policy if exists capa_actions_org_isolation on capa.capa_actions;
create policy capa_actions_org_isolation on capa.capa_actions
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

