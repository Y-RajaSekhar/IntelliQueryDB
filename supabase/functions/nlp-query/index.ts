import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { query, tables, schemas, isMultiTable } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive schema information with data types
    const schemaDetails = Object.entries(schemas).map(([table, fields]) => {
      const sampleData = tables[table]?.[0] || {};
      const fieldDetails = (fields as string[]).map(field => {
        const sampleValue = sampleData[field];
        const dataType = typeof sampleValue === 'number' ? 'number' :
                        typeof sampleValue === 'boolean' ? 'boolean' :
                        Array.isArray(sampleValue) ? 'array' : 'string';
        return `  - ${field} (${dataType})${sampleValue !== undefined ? ` e.g. "${sampleValue}"` : ''}`;
      }).join('\n');
      
      return `TABLE: ${table}\nFIELDS:\n${fieldDetails}\nSAMPLE ROW: ${JSON.stringify(sampleData, null, 2)}`;
    }).join('\n\n');

    const systemPrompt = `You are QueryMind AI - an expert Text-to-SQL assistant that converts natural language queries into precise SQL operations.

=== DATABASE SCHEMA ===
${schemaDetails}

=== YOUR CAPABILITIES ===
1. FILTERING: Filter data by any field with conditions (equals, greater than, less than, contains, etc.)
2. SORTING: Order results by any field (ascending or descending)
3. AGGREGATION: Calculate COUNT, SUM, AVG, MIN, MAX on numeric fields
4. GROUPING: Group data by categorical fields and count occurrences
5. LIMITING: Restrict result count
6. MULTI-TABLE: For multiple tables, perform JOIN operations

=== QUERY INTERPRETATION RULES ===
- "show", "list", "display", "get", "find" → retrieve data
- "how many", "count", "number of" → COUNT aggregation
- "average", "mean" → AVG aggregation
- "total", "sum" → SUM aggregation
- "highest", "maximum", "top", "best" → MAX or sort DESC with LIMIT
- "lowest", "minimum", "bottom", "worst" → MIN or sort ASC with LIMIT
- "by [field]" usually means GROUP BY or ORDER BY
- "where", "with", "that has" → FILTER condition
- "contains", "like", "includes" → CONTAINS filter
- "top N", "first N" → LIMIT N with appropriate sort
- "youngest", "oldest", "newest" → sort by date/age field

=== IMPORTANT INSTRUCTIONS ===
- ALWAYS analyze the query carefully and map it to the correct fields
- For "top N by X", sort by X descending and limit to N
- For "youngest/oldest", determine the age/date field and sort appropriately
- When filtering by text, use CONTAINS for partial matches
- For aggregations, clearly specify the field and aggregation type
- Include a clear interpretation of what you understood from the query

=== SECURITY ===
- Only generate SELECT operations (no INSERT, UPDATE, DELETE, DROP)
- Only use fields that exist in the schema
- Validate all values are reasonable`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Convert this natural language query to SQL operations: "${query}"` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_query",
            description: "Analyze the natural language query and return structured query parameters",
            parameters: {
              type: "object",
              properties: {
                interpretation: { 
                  type: "string", 
                  description: "Clear explanation of what the AI understood from the query (1-2 sentences)"
                },
                queryType: {
                  type: "string",
                  enum: ["select", "aggregate", "groupby", "join"],
                  description: "The main type of query being performed"
                },
                sqlQuery: { 
                  type: "string", 
                  description: "Complete SQL query string for complex multi-table joins" 
                },
                joins: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fromTable: { type: "string", description: "Primary table name" },
                      toTable: { type: "string", description: "Secondary table to join" },
                      fromField: { type: "string", description: "Field from primary table" },
                      toField: { type: "string", description: "Field from secondary table" },
                      joinType: { type: "string", enum: ["INNER", "LEFT", "RIGHT", "FULL"], description: "Type of join" }
                    },
                    required: ["fromTable", "toTable", "fromField", "toField"]
                  },
                  description: "Join operations for multi-table queries"
                },
                operations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { 
                        type: "string", 
                        enum: ["filter", "sort", "aggregate", "groupby", "limit"],
                        description: "Operation type"
                      },
                      table: { type: "string", description: "Table name for this operation" },
                      field: { type: "string", description: "Field name to operate on" },
                      condition: { 
                        type: "string", 
                        enum: ["gt", "lt", "gte", "lte", "eq", "neq", "contains", "startswith", "endswith", "avg", "sum", "max", "min", "count", "asc", "desc"],
                        description: "Condition or aggregation type"
                      },
                      value: { 
                        description: "Value for comparison, or limit number. Use appropriate type (number for numeric comparisons, string for text)"
                      }
                    },
                    required: ["type"]
                  },
                  description: "Array of operations to apply in sequence"
                },
                selectFields: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific fields to select (if not all)"
                }
              },
              required: ["interpretation", "operations"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_query" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue using AI queries." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service temporarily unavailable. Please try again.");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error("AI could not process your query. Please try rephrasing.");
    }
    
    const parsedResponse = JSON.parse(toolCall.function.arguments);
    
    // Log for debugging
    console.log("Query:", query);
    console.log("AI Response:", JSON.stringify(parsedResponse, null, 2));
    
    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to process query. Please try again.",
        interpretation: "Unable to process your query"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
