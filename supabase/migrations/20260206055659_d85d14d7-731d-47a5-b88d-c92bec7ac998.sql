-- Add owner-only SELECT policy for students table (if not exists)
-- This ensures regular users can only see their own student record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'students_select_own'
  ) THEN
    CREATE POLICY "students_select_own" ON public.students
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
  END IF;
END
$$;