-- Create table for saved analytics configurations
CREATE TABLE public.saved_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  analysis_type TEXT NOT NULL,
  field1 TEXT NOT NULL,
  field2 TEXT,
  config JSON,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view saved analytics" 
ON public.saved_analytics 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create saved analytics" 
ON public.saved_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update saved analytics" 
ON public.saved_analytics 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete saved analytics" 
ON public.saved_analytics 
FOR DELETE 
USING (true);