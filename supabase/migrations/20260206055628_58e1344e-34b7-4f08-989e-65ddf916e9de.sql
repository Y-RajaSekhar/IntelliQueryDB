-- Drop the overly permissive students_auth_select policy
-- This policy allows any authenticated user to read all student records
-- The students_select_own policy already correctly restricts access to owner only
DROP POLICY IF EXISTS "students_auth_select" ON public.students;