
-- Create schema_relationships table to store FK-like links between schemas
CREATE TABLE public.schema_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_schema_id UUID NOT NULL REFERENCES public.data_schemas(id) ON DELETE CASCADE,
  target_schema_id UUID NOT NULL REFERENCES public.data_schemas(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'one_to_many',
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate relationships
  UNIQUE(source_schema_id, target_schema_id, source_field, target_field)
);

-- Enable RLS
ALTER TABLE public.schema_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own relationships
CREATE POLICY "schema_relationships_select_own"
  ON public.schema_relationships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "schema_relationships_insert_own"
  ON public.schema_relationships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schema_relationships_update_own"
  ON public.schema_relationships FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "schema_relationships_delete_own"
  ON public.schema_relationships FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_schema_relationships_user ON public.schema_relationships(user_id);
CREATE INDEX idx_schema_relationships_source ON public.schema_relationships(source_schema_id);
CREATE INDEX idx_schema_relationships_target ON public.schema_relationships(target_schema_id);
