// index.ts for saq_shizzz
// Deno based edge function for supabse purposes
// a combination of logic that originally formed the saq_ingest and saq.py files 
// we both get the links and parse the links to ensure their are valid and use the db information for ingredients 
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// SAQ API CONFIG 
const SAQ_BASE_URL = "https:";
const API_URL = "https://catalog-service.adobe.io/graphql";
const HEADERS = {
  accept: "*/*",
  "content-type": "application/json",
  "x-api-key": "7a7d7422bd784f2481a047e03a73feaf",
  "magento-environment-id": "2ce24571-9db9-4786-84a9-5f129257ccbb",
  "magento-store-code": "main_website_store",
  "magento-store-view-code": "en",
  "magento-website-code": "base",
  "magento-customer-group": "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c",
  origin: "https://www.saq.com",
  referer: "https://www.saq.com/",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
};
const QUERY = `
query productSearch(
  $phrase: String!,
  $pageSize: Int,
  $currentPage: Int = 1,
  $filter: [SearchClauseInput!],
  $sort: [ProductSearchSortInput!],
  $context: QueryContextInput
) {
  productSearch(
    phrase: $phrase,
    page_size: $pageSize,
    current_page: $currentPage,
    filter: $filter,
    sort: $sort,
    context: $context
  ) {
    items {
      product {
        name
        canonical_url
        price_range {
          minimum_price {
            final_price {
              value
              currency
            }
            regular_price {
              value
              currency
            }
          }
        }
      }
      productView {
        attributes {
          name
          value
        }
      }
    }
  }
}
`;
// SAQ HELPER
async function fetchFirstSaqProduct(phrase) {
  const payload = {
    query: QUERY,
    variables: {
      phrase,
      pageSize: 5,
      currentPage: 1,
      filter: [
        {
          attribute: "visibility",
          in: [
            "Search",
            "Catalog, Search"
          ]
        }
      ],
      sort: [
        {
          attribute: "relevance",
          direction: "DESC"
        }
      ],
      context: {
        customerGroup: "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c"
      }
    }
  };
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("SAQ HTTP error", resp.status, text);
    throw new Error(`SAQ HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const items = data?.data?.productSearch?.items ?? [];
  if (!items.length) return null;
  // Only accept product pages whose canonical_url ends in digits
  const candidate = items.find((item)=>{
    const url = item?.product?.canonical_url;
    return url && /\/\d+$/.test(url);
  });
  if (!candidate) return null;
  const product = candidate.product;
  const attrs = candidate.productView?.attributes ?? [];
  const sizeAttr = attrs.find((a)=>a?.name === "format_contenant_ml");
  const size = sizeAttr?.value ? `${sizeAttr.value} ml` : null;
  const finalPrice = product?.price_range?.minimum_price?.final_price?.value ?? null;
  return {
    name: product.name,
    url: SAQ_BASE_URL + product.canonical_url,
    size,
    price: finalPrice
  };
}
// EDGE FUNCTION HANDLER
Deno.serve(async (_req)=>{
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({
      error: "Supabase env vars not set"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false
    }
  });
  // Load all ingredients
  const { data: ingredients, error: ingError } = await supabase.from("ingredient").select("id, name").order("name");
  if (ingError) {
    console.error("DB error loading ingredients", ingError);
    return new Response(JSON.stringify({
      error: ingError.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const results = [];
  const nowIso = ()=>new Date().toISOString();
  for (const ing of ingredients ?? []){
    const phrase = ing.name;
    console.log("Looking up SAQ for", phrase, "id=", ing.id);
    try {
      const product = await fetchFirstSaqProduct(phrase);
      if (!product) {
        // No product found: still upsert a row so we know we checked
        const { error } = await supabase.from("saq_product").upsert({
          ingredient_id: ing.id,
          phrase,
          saq_name: null,
          saq_url: null,
          saq_price: null,
          size: null,
          last_checked: nowIso()
        }, {
          onConflict: "ingredient_id"
        });
        if (error) {
          console.error("Upsert (no product) error for", phrase, error);
          results.push({
            ingredient: phrase,
            status: "db_error",
            message: error.message
          });
        } else {
          results.push({
            ingredient: phrase,
            status: "no_product"
          });
        }
      } else {
        // Product found: always overwrite row for that ingredient_id
        const { error } = await supabase.from("saq_product").upsert({
          ingredient_id: ing.id,
          phrase,
          saq_name: product.name,
          saq_url: product.url,
          saq_price: product.price,
          size: product.size,
          last_checked: nowIso()
        }, {
          onConflict: "ingredient_id"
        });
        if (error) {
          console.error("Upsert (product) error for", phrase, error);
          results.push({
            ingredient: phrase,
            status: "db_error",
            message: error.message
          });
        } else {
          results.push({
            ingredient: phrase,
            status: "product_saved",
            saq_name: product.name,
            saq_url: product.url,
            size: product.size,
            price: product.price
          });
        }
      }
    } catch (e) {
      console.error("Error for ingredient", phrase, e);
      results.push({
        ingredient: phrase,
        status: "saq_error",
        message: String(e)
      });
    }
  }
  return new Response(JSON.stringify({
    processed: results.length,
    results
  }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
});
