-- Force the bucket to be public (in case it was created as private and ON CONFLICT skipped it)
UPDATE storage.buckets
SET public = true
WHERE id = 'task_photos';

-- Ensure the public access policy exists and is correct (re-runnable)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'task_photos' );
