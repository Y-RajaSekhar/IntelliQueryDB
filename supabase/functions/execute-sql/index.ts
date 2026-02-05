 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 // Strict allowlist of tables that can be queried
 const ALLOWED_TABLES = ['data_records'] as const;
 type AllowedTable = typeof ALLOWED_TABLES[number];
 
 // Allowed operations
 type AllowedOperation = 'select' | 'insert' | 'update' | 'delete';
 
 interface QueryRequest {
   operation: AllowedOperation;
   table: AllowedTable;
   // For SELECT
   select?: string;
   limit?: number;
   orderBy?: { column: string; ascending?: boolean };
   filters?: Array<{ column: string; operator: string; value: unknown }>;
   // For INSERT
   data?: Record<string, unknown>;
   // For UPDATE/DELETE
   id?: string;
   updateData?: Record<string, unknown>;
 }
 
 function isAllowedTable(table: string): table is AllowedTable {
   return ALLOWED_TABLES.includes(table as AllowedTable);
 }
 
 function validateRequest(body: unknown): { valid: true; request: QueryRequest } | { valid: false; error: string } {
   if (!body || typeof body !== 'object') {
     return { valid: false, error: 'Request body must be an object' };
   }
 
   const req = body as Record<string, unknown>;
   
   // Validate operation
   const validOps: AllowedOperation[] = ['select', 'insert', 'update', 'delete'];
   if (!req.operation || !validOps.includes(req.operation as AllowedOperation)) {
     return { valid: false, error: `Operation must be one of: ${validOps.join(', ')}` };
   }
   
   // Validate table
   if (!req.table || typeof req.table !== 'string') {
     return { valid: false, error: 'Table name is required' };
   }
   
   if (!isAllowedTable(req.table)) {
     return { valid: false, error: `Table '${req.table}' is not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}` };
   }
   
   // Validate limit if present
   if (req.limit !== undefined && (typeof req.limit !== 'number' || req.limit < 1 || req.limit > 1000)) {
     return { valid: false, error: 'Limit must be a number between 1 and 1000' };
   }
 
   // Validate ID for update/delete
   if ((req.operation === 'update' || req.operation === 'delete') && !req.id) {
     return { valid: false, error: 'ID is required for update/delete operations' };
   }
 
   if (req.id && typeof req.id !== 'string') {
     return { valid: false, error: 'ID must be a string' };
   }
   
   return { valid: true, request: req as unknown as QueryRequest };
 }
 
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
     
     // Use user-scoped client that respects RLS - NO SERVICE ROLE
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
 
     const body = await req.json();
     
     // Validate request structure
     const validation = validateRequest(body);
     if (!validation.valid) {
       return new Response(
         JSON.stringify({ error: validation.error }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const { request } = validation;
     const startTime = performance.now();
     
     let result: { data?: unknown; message?: string; rowsAffected?: number } = {};
 
     console.log(`User ${user.id} executing ${request.operation} on ${request.table}`);
 
     if (request.operation === 'select') {
       // Build SELECT query using Supabase query builder (RLS enforced)
       let query = supabaseClient
         .from(request.table)
         .select(request.select || '*');
       
       // Apply limit (default 100, max 1000)
       query = query.limit(request.limit || 100);
       
       // Apply ordering if specified
       if (request.orderBy?.column) {
         query = query.order(request.orderBy.column, { 
           ascending: request.orderBy.ascending ?? false 
         });
       }
       
       const { data, error } = await query;
       
       if (error) throw error;
       
       // For data_records, extract the data field for display
       if (request.table === 'data_records') {
         result.data = (data || []).map((r: { data?: unknown }) => r.data);
       } else {
         result.data = data;
       }
       
     } else if (request.operation === 'insert') {
       if (!request.data || typeof request.data !== 'object') {
         return new Response(
           JSON.stringify({ error: 'Data object is required for insert' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       // Insert with user_id automatically set (RLS will verify)
       const { data, error } = await supabaseClient
         .from(request.table)
         .insert([{
           record_type: 'manual_insert',
           data: request.data,
           user_id: user.id
         }])
         .select();
       
       if (error) throw error;
       result.message = `${data?.length || 1} row(s) inserted`;
       result.rowsAffected = data?.length || 1;
       
     } else if (request.operation === 'update') {
       if (!request.updateData || typeof request.updateData !== 'object') {
         return new Response(
           JSON.stringify({ error: 'Update data is required' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       // Update by ID - RLS will enforce ownership
       const { data, error } = await supabaseClient
         .from(request.table)
         .update({ data: request.updateData })
         .eq('id', request.id!)
         .select();
       
       if (error) throw error;
       result.message = `${data?.length || 0} row(s) updated`;
       result.rowsAffected = data?.length || 0;
       
     } else if (request.operation === 'delete') {
       // Delete by ID - RLS will enforce ownership
       const { data, error } = await supabaseClient
         .from(request.table)
         .delete()
         .eq('id', request.id!)
         .select();
       
       if (error) throw error;
       result.message = `${data?.length || 0} row(s) deleted`;
       result.rowsAffected = data?.length || 0;
     }
 
     const executionTime = performance.now() - startTime;
 
     return new Response(
       JSON.stringify({
         success: true,
         operation: request.operation,
         table: request.table,
         data: result.data || null,
         message: result.message || null,
         rowsAffected: result.rowsAffected || 0,
         executionTime
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("Error:", error);
     return new Response(
       JSON.stringify({ 
         success: false,
         error: error instanceof Error ? error.message : "Query execution failed" 
       }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });
