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

    const systemPrompt = isMultiTable 
      ? `You are an advanced data analysis AI that handles complex multi-table queries.

Available tables and their schemas:
${Object.entries(schemas).map(([table, fields]) => 
  `Table: ${table}\nFields: ${(fields as string[]).join(", ")}\nSample: ${JSON.stringify(tables[table]?.[0] || {})}`
).join("\n\n")}

You can perform:
- Cross-table queries with JOINs
- Complex aggregations across multiple tables
- Comparative analysis between tables
- Correlation and relationship discovery

Interpret the user's query and determine what operations and joins are needed.`
      : `You are a data analysis AI that analyzes natural language queries about data.

Available tables and schemas:
${Object.entries(schemas).map(([table, fields]) => 
  `Table: ${table}\nFields: ${(fields as string[]).join(", ")}\nSample: ${JSON.stringify(tables[table]?.[0] || {})}`
).join("\n\n")}

Interpret the user's query and determine what operations are needed.`;

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
          { role: "user", content: query }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_query",
            description: "Analyze the natural language query and return structured query parameters for single or multi-table queries",
            parameters: {
              type: "object",
              properties: {
                interpretation: { type: "string", description: "Brief explanation of what was understood" },
                sqlQuery: { type: "string", description: "Complete SQL query if multi-table with complex joins" },
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
                      type: { type: "string", enum: ["filter", "sort", "aggregate", "groupby", "limit", "join"] },
                      table: { type: "string", description: "Table name for this operation" },
                      field: { type: "string", description: "Field name to operate on" },
                      condition: { type: "string", enum: ["gt", "lt", "gte", "lte", "eq", "contains", "avg", "sum", "max", "min", "count", "asc", "desc"] },
                      value: { description: "Value for comparison or limit number" }
                    },
                    required: ["type"]
                  }
                }
              },
              required: ["interpretation"],
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error("Invalid AI response format");
    }
    
    const parsedResponse = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
