# Incident Storage Setup Guide

## Issue: Images Not Appearing in PDF Downloads

If incident photos are not appearing in PDF downloads, the storage buckets may not exist or may not be configured as public.

## Quick Fix: Create Storage Buckets

Run this SQL in your Supabase Dashboard SQL Editor:

```sql
-- Create storage bucket for incident images (photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-images',
  'incident-images',
  true,  -- PUBLIC bucket - images accessible without auth
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage bucket for incident documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-documents',
  'incident-documents',
  true,  -- PUBLIC bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true;
```

## RLS Policies for Upload/Delete

Also run these policies to allow authenticated users to manage files:

```sql
-- Drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "Allow authenticated users to upload incident images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read incident images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete incident images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload incident documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read incident documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete incident documents" ON storage.objects;

-- RLS Policies for incident-images bucket
CREATE POLICY "Allow authenticated users to upload incident images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident-images');

CREATE POLICY "Allow authenticated users to read incident images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'incident-images');

CREATE POLICY "Allow authenticated users to delete incident images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'incident-images');

-- RLS Policies for incident-documents bucket
CREATE POLICY "Allow authenticated users to upload incident documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident-documents');

CREATE POLICY "Allow authenticated users to read incident documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'incident-documents');

CREATE POLICY "Allow authenticated users to delete incident documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'incident-documents');
```

## Alternative: Create Buckets via Dashboard UI

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Create `incident-images`:

   - Name: `incident-images`
   - Public bucket: ✅ Enabled
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp`

4. Create `incident-documents`:
   - Name: `incident-documents`
   - Public bucket: ✅ Enabled
   - File size limit: 50MB
   - Allowed MIME types: `application/pdf, application/msword, image/jpeg, image/png`

## Verify Bucket Configuration

After creating the buckets, verify they're public:

```sql
SELECT id, name, public FROM storage.buckets
WHERE id IN ('incident-images', 'incident-documents');
```

Both should show `public = true`.

## Testing

1. Upload a new incident with photos
2. Check browser console for any storage errors
3. Try downloading the PDF - images should now appear
