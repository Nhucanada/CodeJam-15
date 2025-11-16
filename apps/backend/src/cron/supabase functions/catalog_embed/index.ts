// index.ts for catalog_embed
// operational code located in supabase directly for easier scheduling and secret implementation
// Deno based edge function for supabse purposes
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const GEMINI_MODEL = "models/text-embedding-004";
const SOURCE_TAG = "catalog_v1";
// Helper to embed Gemini 
async function embedText(text) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY env var is not set");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:embedContent?key=${apiKey}`;
  const body = {
    content: {
      parts: [
        {
          text
        }
      ]
    }
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const textBody = await resp.text();
    console.error("Gemini HTTP error", resp.status, textBody);
    throw new Error(`Gemini HTTP ${resp.status}`);
  }
  const json = await resp.json();
  // handles both possible shapes
  //  - { embedding: { values: [...] } }
  //  - { embeddings: [ { values: [...] }, ... ] }
  let values;
  if (json.embedding?.values && Array.isArray(json.embedding.values)) {
    values = json.embedding.values;
  } else if (Array.isArray(json.embeddings) && json.embeddings[0]?.values && Array.isArray(json.embeddings[0].values)) {
    values = json.embeddings[0].values;
  }
  if (!values) {
    console.error("Unexpected Gemini response shape:", json);
    throw new Error("Unexpected Gemini response shape");
  }
  return values;
}
// Supabase helpers 
function getSupabase() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !serviceKey || !geminiKey) {
    return {
      ok: false,
      errorResponse: new Response(JSON.stringify({
        ok: false,
        error: "Missing required env vars",
        env: {
          SUPABASE_URL: !!supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
          GEMINI_API_KEY: !!geminiKey
        }
      }, null, 2), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      })
    };
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false
    }
  });
  return {
    ok: true,
    supabase
  };
}
// Upsert helpers
async function upsertCocktailEmbeddings(supabase) {
  const { data: cocktails, error } = await supabase.from("cocktail").select("id, name, description").order("name");
  if (error) {
    throw new Error(`Error loading cocktails: ${error.message}`);
  }
  let count = 0;
  for (const c of cocktails ?? []){
    const textPieces = [
      c.name,
      c.description
    ].filter(Boolean);
    if (!textPieces.length) continue;
    const embedding = await embedText(textPieces.join(" - "));
    // Does an embedding already exist for this cocktail & source?
    const { data: existing, error: existingErr } = await supabase.from("cocktail_embedding").select("id").eq("cocktail_id", c.id).eq("source", SOURCE_TAG).maybeSingle();
    if (existingErr && existingErr.code !== "PGRST116") {
      console.error("Error checking existing cocktail_embedding", existingErr);
      continue;
    }
    if (existing?.id) {
      const { error: updateErr } = await supabase.from("cocktail_embedding").update({
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      }).eq("id", existing.id);
      if (updateErr) {
        console.error("Error updating cocktail_embedding", updateErr);
      }
    } else {
      const { error: insertErr } = await supabase.from("cocktail_embedding").insert({
        cocktail_id: c.id,
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      });
      if (insertErr) {
        console.error("Error inserting cocktail_embedding", insertErr);
      }
    }
    count += 1;
  }
  return count;
}
async function upsertIngredientEmbeddings(supabase) {
  const { data: ingredients, error } = await supabase.from("ingredient").select("id, name, flavor_profile").order("name");
  if (error) {
    throw new Error(`Error loading ingredients: ${error.message}`);
  }
  let count = 0;
  for (const ing of ingredients ?? []){
    const textPieces = [
      ing.name,
      ing.flavor_profile
    ].filter(Boolean);
    if (!textPieces.length) continue;
    const embedding = await embedText(textPieces.join(" - "));
    const { data: existing, error: existingErr } = await supabase.from("ingredient_embedding").select("id").eq("ingredient_id", ing.id).eq("source", SOURCE_TAG).maybeSingle();
    if (existingErr && existingErr.code !== "PGRST116") {
      console.error("Error checking existing ingredient_embedding", existingErr);
      continue;
    }
    if (existing?.id) {
      const { error: updateErr } = await supabase.from("ingredient_embedding").update({
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      }).eq("id", existing.id);
      if (updateErr) {
        console.error("Error updating ingredient_embedding", updateErr);
      }
    } else {
      const { error: insertErr } = await supabase.from("ingredient_embedding").insert({
        ingredient_id: ing.id,
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      });
      if (insertErr) {
        console.error("Error inserting ingredient_embedding", insertErr);
      }
    }
    count += 1;
  }
  return count;
}
async function upsertSaqProductEmbeddings(supabase) {
  const { data: saqProducts, error } = await supabase.from("saq_product").select("id, saq_name, saq_url, size").order("saq_name");
  if (error) {
    throw new Error(`Error loading saq_product: ${error.message}`);
  }
  let count = 0;
  for (const p of saqProducts ?? []){
    const textPieces = [
      p.saq_name,
      p.saq_url,
      p.size
    ].filter(Boolean);
    if (!textPieces.length) continue;
    const embedding = await embedText(textPieces.join(" - "));
    const { data: existing, error: existingErr } = await supabase.from("saq_product_embedding").select("id").eq("saq_product_id", p.id).eq("source", SOURCE_TAG).maybeSingle();
    if (existingErr && existingErr.code !== "PGRST116") {
      console.error("Error checking saq_product_embedding", existingErr);
      continue;
    }
    if (existing?.id) {
      const { error: updateErr } = await supabase.from("saq_product_embedding").update({
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      }).eq("id", existing.id);
      if (updateErr) {
        console.error("Error updating saq_product_embedding", updateErr);
      }
    } else {
      const { error: insertErr } = await supabase.from("saq_product_embedding").insert({
        saq_product_id: p.id,
        model: GEMINI_MODEL,
        embedding,
        source: SOURCE_TAG
      });
      if (insertErr) {
        console.error("Error inserting saq_product_embedding", insertErr);
      }
    }
    count += 1;
  }
  return count;
}
// Main handler
Deno.serve(async (_req)=>{
  const { ok, supabase, errorResponse } = getSupabase();
  if (!ok || !supabase) {
    return errorResponse;
  }
  try {
    const [cocktails, ingredients, saqProducts] = await Promise.all([
      upsertCocktailEmbeddings(supabase),
      upsertIngredientEmbeddings(supabase),
      upsertSaqProductEmbeddings(supabase)
    ]);
    return new Response(JSON.stringify({
      ok: true,
      model: GEMINI_MODEL,
      source: SOURCE_TAG,
      cocktails,
      ingredients,
      saq_products: saqProducts
    }, null, 2), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("catalog_embed error:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e)
    }, null, 2), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
