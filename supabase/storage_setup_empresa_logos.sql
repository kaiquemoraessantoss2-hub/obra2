-- storage_setup_empresa_logos.sql
-- Bucket público para logos das empresas. Path = {company_id}/logo.{ext}.
-- Aplicar uma vez via MCP / SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'empresa-logos',
  'empresa-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT é livre (bucket público)
DROP POLICY IF EXISTS "empresa_logos_select" ON storage.objects;
CREATE POLICY "empresa_logos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'empresa-logos');

-- INSERT/UPDATE/DELETE: usuário autenticado só pode mexer no folder da SUA empresa
DROP POLICY IF EXISTS "empresa_logos_insert_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_insert_own_company" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "empresa_logos_update_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_update_own_company" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "empresa_logos_delete_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_delete_own_company" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );
