-- RLS subqueries used `u.id = auth.uid()` but core.users.id is bigint and auth.uid() is uuid.
-- Resolve lookup via auth_user_id (Supabase Auth user id).

drop policy if exists users_org_isolation on core.users;
create policy users_org_isolation on core.users
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists departments_org_isolation on core.departments;
create policy departments_org_isolation on core.departments
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists locations_org_isolation on core.locations;
create policy locations_org_isolation on core.locations
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists capa_records_org_isolation on capa.capa_records;
create policy capa_records_org_isolation on capa.capa_records
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists capa_actions_org_isolation on capa.capa_actions;
create policy capa_actions_org_isolation on capa.capa_actions
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists capa_comments_org_isolation on capa.capa_comments;
create policy capa_comments_org_isolation on capa.capa_comments
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists capa_status_history_org_isolation on capa.capa_status_history;
create policy capa_status_history_org_isolation on capa.capa_status_history
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists capa_action_status_history_org_isolation on capa.capa_action_status_history;
create policy capa_action_status_history_org_isolation on capa.capa_action_status_history
  for all
  using (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select u.organization_id
      from core.users u
      where u.auth_user_id = auth.uid()
    )
  );
