-- Create table for query history and favorites
CREATE TABLE public.query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  selected_tables TEXT[] NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  execution_count INTEGER NOT NULL DEFAULT 1,
  last_executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY query_history_select ON public.query_history FOR SELECT USING (true);
CREATE POLICY query_history_insert ON public.query_history FOR INSERT WITH CHECK (true);
CREATE POLICY query_history_update ON public.query_history FOR UPDATE USING (true);
CREATE POLICY query_history_delete ON public.query_history FOR DELETE USING (true);

-- Create index for faster queries
CREATE INDEX idx_query_history_favorite ON public.query_history(is_favorite);
CREATE INDEX idx_query_history_executed ON public.query_history(last_executed_at DESC);