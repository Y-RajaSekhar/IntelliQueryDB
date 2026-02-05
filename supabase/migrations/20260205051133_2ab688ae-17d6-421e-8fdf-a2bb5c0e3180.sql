-- Fix overly permissive write policies on students table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "students_auth_insert" ON public.students;
DROP POLICY IF EXISTS "students_auth_update" ON public.students;
DROP POLICY IF EXISTS "students_auth_delete" ON public.students;

-- Create owner-only policies for write operations
CREATE POLICY "students_insert_own" ON public.students
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "students_update_own" ON public.students
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "students_delete_own" ON public.students
FOR DELETE TO authenticated
USING (auth.uid() = id);