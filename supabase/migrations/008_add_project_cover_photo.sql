-- Adiciona coluna para a foto de capa do projeto (data URL base64 ou URL externa)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cover_photo text;
