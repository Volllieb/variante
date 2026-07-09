-- 015_domain_gate.sql
-- Domain-Gate: Jeder User braucht eine verifizierte Website bevor Tests möglich sind.
-- Free/Pro = max 1 Domain, Agency = unlimited.

-- Zählt verified domains eines Users (für Limit-Check).
create or replace function count_verified_domains(p_user_id uuid)
returns int language sql as $$
  select count(*)::int from domains where user_id = p_user_id and verified = true;
$$;

-- Zählt alle domains eines Users (für Total-Limit).
create or replace function count_domains(p_user_id uuid)
returns int language sql as $$
  select count(*)::int from domains where user_id = p_user_id;
$$;
