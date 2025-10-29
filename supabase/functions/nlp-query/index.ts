import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, schema, sampleData, recordType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a data analysis AI that helps users query their data using natural language.

Given:
- Record type: ${recordType}
- Schema (available fields): ${schema.join(", ")}
- Sample data: ${JSON.stringify(sampleData.slice(0, 3))}

Your task is to:
1. Understand the user's natural language query
2. Determine what filtering, aggregation, or analysis they want
3. Return a structured response with:
   - interpretation: A brief explanation of what you understood
   - operation: The type of operation (filter, aggregate, count, sort, search)
   - field: The primary field being queried (if applicable)
   - condition: The condition to apply (if applicable)
   - value: The value to compare against (if applicable)
   - limit: Number of results to return (if applicable)

Respond ONLY with valid JSON in this exact format:
{
  "interpretation": "string explaining what you understood",
  "operation": "filter|aggregate|count|sort|search|all",
  "field": "field_name or null",
  "condition": "gt|lt|gte|lte|eq|contains|avg|sum|max|min|null",
  "value": "value or null",
  "limit": number or null
}`;

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
        temperature: 0.3,
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
    const content = aiResponse.choices[0].message.content;
    
    // Extract JSON from the response (in case AI adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    
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
