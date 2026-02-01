import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    console.log("Processing file:", fileName, "Type:", file.type, "Size:", file.size, "User:", user.id);

    // Handle CSV files
    if (fileName.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      
      if (rows.length < 2) {
        throw new Error("CSV file must have at least a header row and one data row");
      }

      const headers = rows[0];
      const data = rows.slice(1)
        .filter(row => row.some(cell => cell)) // Filter empty rows
        .map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            const value = row[index] || '';
            // Try to parse as number
            obj[header] = isNaN(Number(value)) || value === '' ? value : Number(value);
          });
          return obj;
        });

      return new Response(
        JSON.stringify({ success: true, data, recordType: 'csv_import' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PDF files
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      // For PDF, we'll extract text and look for table-like structures
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Simple PDF text extraction (basic implementation)
      // In production, you might want to use a proper PDF library
      const text = new TextDecoder().decode(uint8Array);
      
      // Try to detect tabular data patterns
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.map((line, index) => ({
        line_number: index + 1,
        content: line.trim()
      }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data.slice(0, 100), // Limit to first 100 lines
          recordType: 'pdf_import',
          message: 'PDF text extracted. For better results with tables, consider converting to CSV.'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle DOCX files
    if (fileName.endsWith('.docx') || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      
      // Basic DOCX parsing (extract text content)
      // For production, consider using a proper DOCX library
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);
      
      const lines = text.split('\n')
        .filter(line => line.trim() && !line.includes('<?xml'))
        .map(line => line.replace(/<[^>]*>/g, '').trim())
        .filter(line => line.length > 0);

      const data = lines.map((line, index) => ({
        line_number: index + 1,
        content: line
      }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data.slice(0, 100),
          recordType: 'docx_import',
          message: 'Document text extracted. For tables, consider converting to CSV.'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unsupported file format. Please use CSV, PDF, or DOCX files.");

  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
