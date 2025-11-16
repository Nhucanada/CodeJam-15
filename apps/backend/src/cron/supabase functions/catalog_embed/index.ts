// supabase functionailty for vector embedding
// works for garnish, saq_product, cocktail, ingredient
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents";
// text-embedding-004 currently returns 768-dim embeddings
const GEMINI_MODEL = "models/text-embedding-004";
const EMBEDDING_DIM = 768;
const BATCH_SIZE = 32;
// Gemini helpers
async function getEmbeddings(texts, apiKey) {
  if (!texts.length) return [];
  const body = {
    requests: texts.map((t)=>({
        model: GEMINI_MODEL,
        taskType: "RETRIEVAL_DOCUMENT",
        content: {
          parts: [
            {
              text: t
            }
          ]
        }
      }))
  };
  const resp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Gemini HTTP error", resp.status, text);
    throw new Error(`Gemini HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.embeddings || !Array.isArray(data.embeddings)) {
    console.error("Unexpected Gemini response:", JSON.stringify(data, null, 2));
    throw new Error("Unexpected Gemini response shape");
  }
  const vectors = data.embeddings.map((e)=>e.values ?? e.embedding?.values ?? []);
  for (const v of vectors){
    if (v.length !== EMBEDDING_DIM) {
      console.error(`Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${v.length}`);
      throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${v.length}`);
    }
  }
  return vectors;
}
// Text builders 
function buildCocktailText(row) {
  const parts = [];
  parts.push(`COCKTAIL: ${row.name ?? "Unnamed cocktail"}`);
  if (row.type) {
    parts.push(`Type: ${row.type}`);
  }
  if (row.description) {
    parts.push(`Description: ${row.description}`);
  }
  if (row.has_ice !== null && row.has_ice !== undefined) {
    parts.push(`Served with ice: ${row.has_ice ? "yes" : "no"}`);
  }
  return parts.join("\n");
}
function buildIngredientText(row) {
  const lines = [
    `INGREDIENT: ${row.name}`,
    row.abv != null ? `ABV: ${row.abv}%` : null,
    row.hexcode ? `Color hex: ${row.hexcode}` : null,
    row.flavor_profile ? `Flavor profile: ${row.flavor_profile}` : null
  ].filter(Boolean);
  return lines.join("\n");
}
function buildGarnishText(row) {
  return `GARNISH: ${row.name}`;
}
function buildSaqProductText(row, ingredientName) {
  const parts = [
    `SAQ PRODUCT: ${row.saq_name ?? "Unknown product"}`,
    row.saq_price != null ? `Price: ${row.saq_price} CAD` : null,
    row.size ? `Size: ${row.size}` : null,
    ingredientName ? `Base ingredient: ${ingredientName}` : null,
    row.saq_url ? `URL: ${row.saq_url}` : null
  ].filter(Boolean);
  return parts.join("\n");
}
// Insert helpers
async function upsertCocktailEmbeddings(supabase, apiKey) {
  const results = [];
  const { data: cocktails, error } = await supabase.from("cocktail").select("id, name, type, description, has_ice").order("name");
  if (error) {
    console.error("Error loading cocktails:", error);
    return {
      type: "cocktail",
      error: error.message ?? String(error)
    };
  }
  if (!cocktails || cocktails.length === 0) {
    return {
      type: "cocktail",
      ok: true,
      count: 0
    };
  }
  const rows = cocktails;
  const texts = rows.map((row)=>buildCocktailText(row));
  const vectors = await getEmbeddings(texts, apiKey);
  for(let i = 0; i < rows.length; i++){
    const row = rows[i];
    const embedding = vectors[i];
    const content = texts[i];
    try {
      // clear existing, then insert with content
      const { error: delErr } = await supabase.from("cocktail_embedding").delete().eq("cocktail_id", row.id);
      if (delErr) console.error("Delete cocktail_embedding error", delErr);
      const { error: insErr } = await supabase.from("cocktail_embedding").insert({
        cocktail_id: row.id,
        embedding,
        model: GEMINI_MODEL,
        source: "catalog_v1",
        content,
        created_at: new Date().toISOString()
      });
      if (insErr) {
        console.error("Insert cocktail_embedding error", insErr);
        results.push({
          type: "cocktail",
          id: row.id,
          name: row.name,
          error: insErr.message ?? String(insErr)
        });
      } else {
        results.push({
          type: "cocktail",
          id: row.id,
          name: row.name,
          ok: true
        });
      }
    } catch (e) {
      console.error("Unexpected cocktail_embedding error", e);
      results.push({
        type: "cocktail",
        id: row.id,
        name: row.name,
        error: String(e)
      });
    }
  }
  return results;
}
async function upsertIngredientEmbeddings(supabase, apiKey) {
  const { data: ingredients, error } = await supabase.from("ingredient").select("id, name, abv, hexcode, flavor_profile");
  if (error) {
    console.error("Error loading ingredients:", error);
    return {
      type: "ingredient",
      error: error.message
    };
  }
  const rows = ingredients ?? [];
  if (!rows.length) return {
    type: "ingredient",
    processed: 0
  };
  const results = [];
  for(let i = 0; i < rows.length; i += BATCH_SIZE){
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((row)=>buildIngredientText(row));
    let vectors;
    try {
      vectors = await getEmbeddings(texts, apiKey);
    } catch (e) {
      console.error("Gemini error (ingredient batch)", e);
      results.push(...batch.map((row)=>({
          type: "ingredient",
          id: row.id,
          name: row.name,
          error: String(e)
        })));
      continue;
    }
    for(let j = 0; j < batch.length; j++){
      const row = batch[j];
      const embedding = vectors[j];
      const content = texts[j];
      const { error: delErr } = await supabase.from("ingredient_embedding").delete().eq("ingredient_id", row.id);
      if (delErr) console.error("Delete ingredient_embedding error", delErr);
      const { error: insErr } = await supabase.from("ingredient_embedding").insert({
        ingredient_id: row.id,
        embedding,
        model: GEMINI_MODEL,
        source: "catalog_v1",
        content,
        created_at: new Date().toISOString()
      });
      if (insErr) {
        console.error("Insert ingredient_embedding error", insErr);
        results.push({
          type: "ingredient",
          id: row.id,
          name: row.name,
          error: insErr.message
        });
      } else {
        results.push({
          type: "ingredient",
          id: row.id,
          name: row.name,
          ok: true
        });
      }
    }
  }
  return results;
}
async function upsertGarnishEmbeddings(supabase, apiKey) {
  const { data: garnishes, error } = await supabase.from("garnish").select("id, name");
  if (error) {
    console.error("Error loading garnishes:", error);
    return {
      type: "garnish",
      error: error.message
    };
  }
  const rows = garnishes ?? [];
  if (!rows.length) return {
    type: "garnish",
    processed: 0
  };
  const results = [];
  for(let i = 0; i < rows.length; i += BATCH_SIZE){
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((row)=>buildGarnishText(row));
    let vectors;
    try {
      vectors = await getEmbeddings(texts, apiKey);
    } catch (e) {
      console.error("Gemini error (garnish batch)", e);
      results.push(...batch.map((row)=>({
          type: "garnish",
          id: row.id,
          name: row.name,
          error: String(e)
        })));
      continue;
    }
    for(let j = 0; j < batch.length; j++){
      const row = batch[j];
      const embedding = vectors[j];
      const content = texts[j];
      const { error: delErr } = await supabase.from("garnish_embedding").delete().eq("garnish_id", row.id);
      if (delErr) console.error("Delete garnish_embedding error", delErr);
      const { error: insErr } = await supabase.from("garnish_embedding").insert({
        garnish_id: row.id,
        embedding,
        model: GEMINI_MODEL,
        source: "catalog_v1",
        content,
        created_at: new Date().toISOString()
      });
      if (insErr) {
        console.error("Insert garnish_embedding error", insErr);
        results.push({
          type: "garnish",
          id: row.id,
          name: row.name,
          error: insErr.message
        });
      } else {
        results.push({
          type: "garnish",
          id: row.id,
          name: row.name,
          ok: true
        });
      }
    }
  }
  return results;
}
async function upsertSaqProductEmbeddings(supabase, apiKey) {
  const { data: saqRows, error } = await supabase.from("saq_product").select(`
      id,
      ingredient_id,
      phrase,
      saq_name,
      saq_url,
      saq_price,
      size,
      ingredient (
        name
      )
    `);
  if (error) {
    console.error("Error loading saq_product:", error);
    return {
      type: "saq_product",
      error: error.message
    };
  }
  const rows = saqRows ?? [];
  if (!rows.length) return {
    type: "saq_product",
    processed: 0
  };
  const results = [];
  for(let i = 0; i < rows.length; i += BATCH_SIZE){
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((row)=>buildSaqProductText(row, row.ingredient?.name ?? null));
    let vectors;
    try {
      vectors = await getEmbeddings(texts, apiKey);
    } catch (e) {
      console.error("Gemini error (saq_product batch)", e);
      results.push(...batch.map((row)=>({
          type: "saq_product",
          id: row.id,
          saq_name: row.saq_name,
          error: String(e)
        })));
      continue;
    }
    for(let j = 0; j < batch.length; j++){
      const row = batch[j];
      const embedding = vectors[j];
      const content = texts[j];
      const { error: delErr } = await supabase.from("saq_product_embedding").delete().eq("saq_product_id", row.id);
      if (delErr) console.error("Delete saq_product_embedding error", delErr);
      const { error: insErr } = await supabase.from("saq_product_embedding").insert({
        saq_product_id: row.id,
        embedding,
        model: GEMINI_MODEL,
        source: "catalog_v1",
        content,
        created_at: new Date().toISOString()
      });
      if (insErr) {
        console.error("Insert saq_product_embedding error", insErr);
        results.push({
          type: "saq_product",
          id: row.id,
          saq_name: row.saq_name,
          error: insErr.message
        });
      } else {
        results.push({
          type: "saq_product",
          id: row.id,
          saq_name: row.saq_name,
          ok: true
        });
      }
    }
  }
  return results;
}
// ---------- Edge function handler ----------
Deno.serve(async (req)=>{
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const env = {
    SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
    GEMINI_API_KEY: !!geminiKey
  };
  if (!supabaseUrl || !serviceKey || !geminiKey) {
    console.error("Missing env vars", env);
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing required env vars",
      env
    }, null, 2), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "true";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false
    }
  });
  // Preview mode: show a sample of the texts we *would* embed
  if (preview) {
    const { data: sampleCocktails } = await supabase.from("cocktail").select("id, name, type, description, has_ice").limit(3);
    const previewPayload = (sampleCocktails ?? []).map((row)=>({
        id: row.id,
        name: row.name,
        embedding_text: buildCocktailText(row)
      }));
    return new Response(JSON.stringify({
      preview: true,
      model: GEMINI_MODEL,
      source: "catalog_v1",
      cocktails: previewPayload.length,
      samples: previewPayload
    }, null, 2), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const allResults = [];
  const cocktailRes = await upsertCocktailEmbeddings(supabase, geminiKey);
  allResults.push(...Array.isArray(cocktailRes) ? cocktailRes : [
    cocktailRes
  ]);
  const ingredientRes = await upsertIngredientEmbeddings(supabase, geminiKey);
  allResults.push(...Array.isArray(ingredientRes) ? ingredientRes : [
    ingredientRes
  ]);
  const garnishRes = await upsertGarnishEmbeddings(supabase, geminiKey);
  allResults.push(...Array.isArray(garnishRes) ? garnishRes : [
    garnishRes
  ]);
  const saqRes = await upsertSaqProductEmbeddings(supabase, geminiKey);
  allResults.push(...Array.isArray(saqRes) ? saqRes : [
    saqRes
  ]);
  const summary = {
    total: allResults.length,
    cocktails: allResults.filter((r)=>r.type === "cocktail").length,
    ingredients: allResults.filter((r)=>r.type === "ingredient").length,
    garnishes: allResults.filter((r)=>r.type === "garnish").length,
    saq_products: allResults.filter((r)=>r.type === "saq_product").length
  };
  const ok = allResults.every((r)=>!r.error);
  return new Response(JSON.stringify({
    ok,
    summary,
    results: allResults
  }, null, 2), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
