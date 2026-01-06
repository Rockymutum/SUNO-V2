-- Migration: Make handle_new_user idempotent
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(users.display_name, EXCLUDED.display_name), -- Keep existing name if set, else use new
    avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url),       -- Keep existing avatar if set
    updated_at = now();
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is set (this is usually already there, but safe to re-run or just ensure existence)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
