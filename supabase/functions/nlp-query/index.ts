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

    const { query, tables, schemas, isMultiTable, relationships, totalCounts } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive schema information with richer context
    const schemaDetails = Object.entries(schemas).map(([table, fields]) => {
      const sampleRows = tables[table] || [];
      const totalCount = totalCounts?.[table] || sampleRows.length;
      
      // Analyze each field deeply
      const fieldDetails = (fields as string[]).map(field => {
        const values = sampleRows.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined);
        const sampleValue = values[0];
        
        // Better type detection
        let dataType = 'string';
        if (values.length > 0) {
          if (values.every((v: any) => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''))) {
            dataType = 'number';
            const nums = values.map(Number).filter((n: number) => !isNaN(n));
            const min = Math.min(...nums);
            const max = Math.max(...nums);
            const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
            return `  - ${field} (${dataType}, range: ${min}-${max}, avg: ${avg.toFixed(1)})`;
          } else if (values.every((v: any) => typeof v === 'boolean')) {
            dataType = 'boolean';
          } else if (values.every((v: any) => Array.isArray(v))) {
            dataType = 'array';
          } else {
            // For strings, show distinct values if categorical (few unique values)
            const uniqueValues = [...new Set(values.map(String))];
            if (uniqueValues.length <= 15 && uniqueValues.length < values.length * 0.7) {
              return `  - ${field} (${dataType}, categorical, values: [${uniqueValues.map(v => `"${v}"`).join(', ')}])`;
            }
          }
        }
        return `  - ${field} (${dataType})${sampleValue !== undefined ? ` e.g. "${sampleValue}"` : ''}`;
      }).join('\n');
      
      const sampleRowsStr = sampleRows.slice(0, 3).map((r: any, i: number) => 
        `  Row ${i+1}: ${JSON.stringify(r)}`
      ).join('\n');
      
      return `TABLE: ${table} (${totalCount} total records)\nFIELDS:\n${fieldDetails}\nSAMPLE DATA:\n${sampleRowsStr}`;
    }).join('\n\n');

    // Build relationship context
    let relationshipContext = '';
    if (relationships && relationships.length > 0) {
      relationshipContext = '\n=== DEFINED RELATIONSHIPS ===\n' + 
        relationships.map((r: any) => 
          `${r.sourceSchema} .${r.sourceField} → ${r.targetSchema}.${r.targetField} (${r.type}${r.label ? `, label: "${r.label}"` : ''})`
        ).join('\n') + 
        '\nUse these relationships for JOIN operations when queries involve multiple related tables.\n';
    }

    const systemPrompt = `You are IntelliQueryDB AI - an expert Text-to-SQL assistant that converts natural language queries into precise, accurate SQL operations.

=== DATABASE SCHEMA ===
${schemaDetails}
${relationshipContext}
=== CRITICAL ACCURACY RULES ===
1. ALWAYS check the actual field names and data types before generating operations.
2. For numeric comparisons, ensure the field is numeric. For text searches, use the correct field.
3. When the user says "top N", ALWAYS sort descending by the relevant field and limit to N.
4. When the user mentions a specific value, check if it matches any categorical field values exactly.
5. For "average", "total", "count" queries, use the correct aggregation on the correct field.
6. Pay attention to plural/singular forms - "students" likely refers to the table, "student" to a record.
7. If a query mentions fields from multiple tables, use JOIN operations with the defined relationships.
8. For ambiguous field references, prefer the most semantically relevant field.
9. String comparisons should be case-insensitive (use CONTAINS/ILIKE).
10. When no specific sort or filter is requested, return ALL records.

=== QUERY INTERPRETATION ===
- "show", "list", "display", "get", "find", "what are" → SELECT (retrieve data)
- "how many", "count", "number of", "total count" → COUNT aggregation
- "average", "mean", "avg" → AVG aggregation
- "total", "sum", "combined" → SUM aggregation
- "highest", "maximum", "top", "best", "most", "largest" → MAX or ORDER BY DESC + LIMIT
- "lowest", "minimum", "bottom", "worst", "least", "smallest" → MIN or ORDER BY ASC + LIMIT
- "by [field]" → GROUP BY or ORDER BY depending on context
- "where", "with", "that has/have", "whose", "which" → WHERE filter
- "contains", "like", "includes", "has the word" → ILIKE/CONTAINS filter
- "between X and Y" → range filter (field >= X AND field <= Y)
- "top N", "first N", "last N" → LIMIT N with appropriate sort
- "each", "per", "breakdown by" → GROUP BY
- "and" between conditions → multiple filters (AND)
- "or" between conditions → alternative filters (OR)

=== MULTI-STEP QUERY HANDLING ===
When a query combines multiple operations (e.g., "top 3 students by GPA in Computer Science"):
1. First identify all filters (department = "Computer Science")
2. Then identify sorting (ORDER BY gpa DESC)
3. Then identify limits (LIMIT 3)
4. Generate operations in order: filter → sort → limit

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
          { role: "user", content: `Convert this natural language query to SQL operations. Think step by step about what the user wants, then generate the correct operations.\n\nQuery: "${query}"\nAvailable tables: [${Object.keys(schemas).join(', ')}]` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_query",
            description: "Analyze the natural language query and return structured query parameters. Think carefully about field names, data types, and the user's intent.",
            parameters: {
              type: "object",
              properties: {
                interpretation: { 
                  type: "string", 
                  description: "Clear explanation of what you understood from the query and how you plan to answer it (2-3 sentences)"
                },
                queryType: {
                  type: "string",
                  enum: ["select", "aggregate", "groupby", "join"],
                  description: "The main type of query being performed"
                },
                sqlQuery: { 
                  type: "string", 
                  description: "Complete SQL query string. Generate this for ALL queries as a readable reference." 
                },
                joins: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fromTable: { type: "string" },
                      toTable: { type: "string" },
                      fromField: { type: "string" },
                      toField: { type: "string" },
                      joinType: { type: "string", enum: ["INNER", "LEFT", "RIGHT", "FULL"] }
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
                      field: { type: "string", description: "Exact field name from the schema (must match exactly)" },
                      condition: { 
                        type: "string", 
                        enum: ["gt", "lt", "gte", "lte", "eq", "neq", "contains", "startswith", "endswith", "avg", "sum", "max", "min", "count", "asc", "desc"],
                        description: "Condition or aggregation type"
                      },
                      value: { 
                        description: "Value for comparison. Use number type for numeric comparisons, string for text. For limit operations, use the number of results to return."
                      }
                    },
                    required: ["type"]
                  },
                  description: "Array of operations to apply IN ORDER: filters first, then sort, then aggregate/groupby, then limit"
                },
                selectFields: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific fields to select (if not all). Must be exact field names from schema."
                }
              },
              required: ["interpretation", "operations", "sqlQuery"],
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
