-- Adiciona contagem de sobressolos (pavimentos acima do térreo, antes dos andares tipo).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS mezzanines integer DEFAULT 0;

ALTER TABLE building_configs
  ADD COLUMN IF NOT EXISTS mezzanines integer DEFAULT 0;
