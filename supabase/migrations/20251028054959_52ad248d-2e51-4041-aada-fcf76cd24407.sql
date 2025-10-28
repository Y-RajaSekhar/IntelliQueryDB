-- Drop existing restrictive policies for students
DROP POLICY IF EXISTS "students_insert_own" ON students;
DROP POLICY IF EXISTS "students_delete_own" ON students;
DROP POLICY IF EXISTS "students_update_own" ON students;
DROP POLICY IF EXISTS "students_select_own" ON students;

-- Create new policies that allow public access for demo purposes
-- Note: In production, you should restrict this to authenticated users or admins

-- Allow anyone to view students
CREATE POLICY "students_public_select"
  ON students
  FOR SELECT
  USING (true);

-- Allow anyone to insert students
CREATE POLICY "students_public_insert"
  ON students
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update students
CREATE POLICY "students_public_update"
  ON students
  FOR UPDATE
  USING (true);

-- Allow anyone to delete students
CREATE POLICY "students_public_delete"
  ON students
  FOR DELETE
  USING (true);