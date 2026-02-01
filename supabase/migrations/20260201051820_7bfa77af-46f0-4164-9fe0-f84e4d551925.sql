-- Fix promote_to_admin function search_path
DROP FUNCTION IF EXISTS public.promote_to_admin(text);
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update public.profiles 
  set role = 'admin' 
  where email = user_email;
end;
$$;

-- ===== Fix students table RLS (remove public access, require auth) =====
DROP POLICY IF EXISTS "students_public_select" ON public.students;
DROP POLICY IF EXISTS "students_public_insert" ON public.students;
DROP POLICY IF EXISTS "students_public_update" ON public.students;
DROP POLICY IF EXISTS "students_public_delete" ON public.students;

-- Create authenticated-only policies for students
CREATE POLICY "students_auth_select" ON public.students
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "students_auth_insert" ON public.students
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "students_auth_update" ON public.students
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "students_auth_delete" ON public.students
FOR DELETE TO authenticated
USING (true);

-- ===== Fix data_records table RLS (add user_id, remove public access) =====
-- Add user_id column
ALTER TABLE public.data_records ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing records to the first authenticated user (or leave null for cleanup)
-- Drop all public policies
DROP POLICY IF EXISTS "data_records_public_select" ON public.data_records;
DROP POLICY IF EXISTS "data_records_public_insert" ON public.data_records;
DROP POLICY IF EXISTS "data_records_public_update" ON public.data_records;
DROP POLICY IF EXISTS "data_records_public_delete" ON public.data_records;

-- Create user-scoped policies
CREATE POLICY "data_records_select_own" ON public.data_records
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "data_records_insert_own" ON public.data_records
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "data_records_update_own" ON public.data_records
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "data_records_delete_own" ON public.data_records
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ===== Fix saved_analytics table RLS (add user_id, remove public access) =====
ALTER TABLE public.saved_analytics ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Anyone can create saved analytics" ON public.saved_analytics;
DROP POLICY IF EXISTS "Anyone can delete saved analytics" ON public.saved_analytics;
DROP POLICY IF EXISTS "Anyone can update saved analytics" ON public.saved_analytics;
DROP POLICY IF EXISTS "Anyone can view saved analytics" ON public.saved_analytics;

CREATE POLICY "saved_analytics_select_own" ON public.saved_analytics
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "saved_analytics_insert_own" ON public.saved_analytics
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_analytics_update_own" ON public.saved_analytics
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "saved_analytics_delete_own" ON public.saved_analytics
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ===== Fix query_history table RLS (add user_id, remove public access) =====
ALTER TABLE public.query_history ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "query_history_select" ON public.query_history;
DROP POLICY IF EXISTS "query_history_insert" ON public.query_history;
DROP POLICY IF EXISTS "query_history_update" ON public.query_history;
DROP POLICY IF EXISTS "query_history_delete" ON public.query_history;

CREATE POLICY "query_history_select_own" ON public.query_history
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "query_history_insert_own" ON public.query_history
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "query_history_update_own" ON public.query_history
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "query_history_delete_own" ON public.query_history
FOR DELETE TO authenticated
USING (user_id = auth.uid());