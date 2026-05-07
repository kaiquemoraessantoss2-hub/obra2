-- 015_companies_branding.sql
-- Adiciona campos de branding da empresa para uso no Boletim de Medição.
-- proximo_numero_boletim é incrementado a cada export (Plan B2).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_contato text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS responsavel_tecnico text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS responsavel_tecnico_crea text; -- opcional
ALTER TABLE companies ADD COLUMN IF NOT EXISTS proximo_numero_boletim integer NOT NULL DEFAULT 1;
