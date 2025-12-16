-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task_photos', 'task_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Give public access to view photos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'task_photos' );

-- Policy: Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'task_photos' AND auth.role() = 'authenticated' );

-- Policy: Allow users to update their own photos
DROP POLICY IF EXISTS "Auth Update Own" ON storage.objects;
CREATE POLICY "Auth Update Own" 
ON storage.objects FOR UPDATE
USING ( bucket_id = 'task_photos' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'task_photos' AND auth.uid() = owner );

-- Policy: Allow users to delete their own photos
DROP POLICY IF EXISTS "Auth Delete Own" ON storage.objects;
CREATE POLICY "Auth Delete Own" 
ON storage.objects FOR DELETE
USING ( bucket_id = 'task_photos' AND auth.uid() = owner );
