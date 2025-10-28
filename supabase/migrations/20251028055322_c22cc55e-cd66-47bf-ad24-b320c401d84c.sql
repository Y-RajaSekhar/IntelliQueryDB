-- Create a generic data_records table that can store any type of data
CREATE TABLE IF NOT EXISTS public.data_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo purposes)
CREATE POLICY "data_records_public_select"
  ON data_records
  FOR SELECT
  USING (true);

CREATE POLICY "data_records_public_insert"
  ON data_records
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "data_records_public_update"
  ON data_records
  FOR UPDATE
  USING (true);

CREATE POLICY "data_records_public_delete"
  ON data_records
  FOR DELETE
  USING (true);

-- Create an index for faster queries
CREATE INDEX idx_data_records_type ON data_records(record_type);
CREATE INDEX idx_data_records_data ON data_records USING gin(data);