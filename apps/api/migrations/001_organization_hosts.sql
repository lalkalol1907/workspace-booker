-- Множественные домены на организацию: перенос host из organizations в organization_hosts.
-- Выполнить перед деплоем API без synchronize, пока в таблице organizations ещё есть колонка host.

CREATE TABLE IF NOT EXISTS organization_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  host varchar(255) NOT NULL,
  CONSTRAINT uq_organization_hosts_host UNIQUE (host)
);

CREATE INDEX IF NOT EXISTS idx_organization_hosts_organization_id
  ON organization_hosts (organization_id);

INSERT INTO organization_hosts (organization_id, host)
SELECT id, host
FROM organizations
WHERE host IS NOT NULL AND host <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE organizations DROP COLUMN IF EXISTS host;
