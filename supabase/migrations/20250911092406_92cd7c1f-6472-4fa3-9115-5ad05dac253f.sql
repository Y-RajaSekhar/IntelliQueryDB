-- Fix security issue with students table RLS policies
-- Drop existing policies that apply to 'public' role
DROP POLICY IF EXISTS "students_select_own" ON public.students;
DROP POLICY IF EXISTS "students_insert_own" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;
DROP POLICY IF EXISTS "students_delete_own" ON public.students;

-- Create more secure policies that only apply to authenticated users
CREATE POLICY "students_select_own" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "students_insert_own" 
ON public.students 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "students_update_own" 
ON public.students 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "students_delete_own" 
ON public.students 
FOR DELETE 
TO authenticated 
USING (auth.uid() = id);

-- Also add admin policies to allow admins to manage all student records
CREATE POLICY "students_admin_full_access" 
ON public.students 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Apply the same security fixes to other sensitive tables
-- Fix profiles table policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Recreate profiles policies with authenticated users only
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" 
ON public.profiles 
FOR DELETE 
TO authenticated 
USING (auth.uid() = id);

-- Keep the existing admin select policy for profiles
-- (profiles_admin_select_all already exists and is properly configured)