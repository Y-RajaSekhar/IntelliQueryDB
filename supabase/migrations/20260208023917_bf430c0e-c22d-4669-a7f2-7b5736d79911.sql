-- Create data_schemas table for organizing data categories
CREATE TABLE public.data_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1',
    icon text DEFAULT 'folder',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE public.data_schemas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owner-only access
CREATE POLICY "data_schemas_select_own" ON public.data_schemas
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "data_schemas_insert_own" ON public.data_schemas
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "data_schemas_update_own" ON public.data_schemas
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "data_schemas_delete_own" ON public.data_schemas
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add schema_id reference to data_records for categorization
ALTER TABLE public.data_records 
ADD COLUMN schema_id uuid REFERENCES public.data_schemas(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_data_records_schema_id ON public.data_records(schema_id);
CREATE INDEX idx_data_schemas_user_id ON public.data_schemas(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_data_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_data_schemas_updated_at
BEFORE UPDATE ON public.data_schemas
FOR EACH ROW
EXECUTE FUNCTION public.update_data_schemas_updated_at();