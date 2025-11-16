import re
import requests

SAQ_BASE_URL = "https:"
API_URL = "https://catalog-service.adobe.io/graphql"

HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "x-api-key": "7a7d7422bd784f2481a047e03a73feaf",
    "magento-environment-id": "2ce24571-9db9-4786-84a9-5f129257ccbb",
    "magento-store-code": "main_website_store",
    "magento-store-view-code": "en",
    "magento-website-code": "base",
    "magento-customer-group": "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c",
    "origin": "https://www.saq.com",
    "referer": "https://www.saq.com/",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/142.0.0.0 Safari/537.36"
    ),
}

QUERY = """
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
"""


def _is_bottle_url(canonical_url: str) -> bool:
    """
    Heuristic: bottle product pages end with a numeric SKU, e.g. '/en/11639070'.
    We return True only if the last path segment is all digits.
    """
    if not canonical_url:
        return False
    # strip trailing slash, get last segment
    last_segment = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    return last_segment.isdigit()


def get_first_saq_url(phrase: str, page_size: int = 5, current_page: int = 1):
    """
    Search SAQ for a product name and return info for the first *bottle* result.

    Returns a dict:
      {
        "name": str,
        "url": str | None,
        "size": str | None,
        "price_final": {"value": number, "currency": str} | None,
        "price_regular": {"value": number, "currency": str} | None,
      }
    or None if no suitable bottle results.
    """
    payload = {
        "query": QUERY,
        "variables": {
            "phrase": phrase,
            "pageSize": page_size,
            "currentPage": current_page,
            "filter": [
                {"attribute": "visibility", "in": ["Search", "Catalog, Search"]}
            ],
            "sort": [
                {"attribute": "relevance", "direction": "DESC"}
            ],
            "context": {
                "customerGroup": "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c"
            },
        },
    }

    resp = requests.post(API_URL, headers=HEADERS, json=payload)
    resp.raise_for_status()
    data = resp.json()

    items = data.get("data", {}).get("productSearch", {}).get("items", [])
    if not items:
        return None

    # Pick the first item whose canonical_url looks like a bottle page (ends in digits)
    chosen = None
    for item in items:
        product = item.get("product") or {}
        canonical_url = product.get("canonical_url")
        if _is_bottle_url(canonical_url or ""):
            chosen = item
            break

    if not chosen:
        # No bottle-style URLs in the results
        return None

    product = chosen["product"]
    canonical_url = product.get("canonical_url")

    # Build full URL
    if canonical_url and canonical_url.startswith("/"):
        full_url = SAQ_BASE_URL + canonical_url
    else:
        full_url = canonical_url

    # Extract size
    attrs = (chosen.get("productView") or {}).get("attributes") or []
    size_value = next(
        (a.get("value") for a in attrs if a.get("name") == "format_contenant_ml"),
        None,
    )
    size = f"{size_value} ml" if size_value is not None else None

    # Extract price info
    price_info = product.get("price_range", {}).get("minimum_price", {}) or {}
    final_price = price_info.get("final_price") or {}
    regular_price = price_info.get("regular_price") or {}

    # Fallback: if final price missing, use regular price
    price_value = final_price.get("value") or regular_price.get("value")
    price_currency = (
        final_price.get("currency")
        or regular_price.get("currency")
        or "CAD"
    )

    price_final_struct = None
    if price_value is not None:
        price_final_struct = {
            "value": price_value,
            "currency": price_currency,
        }

    return {
        "name": product["name"],
        "url": full_url,
        "size": size,
        "price_final": price_final_struct,
        "price_regular": regular_price or None,
    }


if __name__ == "__main__":
    phrase = input("Bottle name to search on SAQ: ").strip()
    result = get_first_saq_url(phrase)

    if result is None:
        print("No bottle-like products found.")
    else:
        print("Best match (bottle):")
        print("Name:", result["name"])
        print("URL:", result["url"])
        if result["size"]:
            print("Size:", result["size"])
        if result["price_final"]:
            print(
                "Final price:",
                result["price_final"]["value"],
                result["price_final"]["currency"],
            )
        else:
            print("Final price: (not available)")
