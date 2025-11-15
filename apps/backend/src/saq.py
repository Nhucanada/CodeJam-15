#import requests
import requests

# base for further shit
SAQ_BASE_URL = "https:"
API_URL = "https://catalog-service.adobe.io/graphql"

# headers for request scraped from graphql 
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

# query for the graphql api
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

def get_first_saq_url(phrase: str, page_size: int = 5, current_page: int = 1):
    """
    Search SAQ for a product name and return info for the first result.
    Returns a dict with name, url, size, price_final, price_regular, or None if no results.
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

    first = items[0]
    product = first["product"]
    canonical_url = product.get("canonical_url")
    full_url = SAQ_BASE_URL + canonical_url if canonical_url else none

    # Optional: extract size
    attrs = (first.get("productView") or {}).get("attributes") or []
    size_value = next(
        (a.get("value") for a in attrs if a.get("name") == "format_contenant_ml"),
        None,
    )
    size = f"{size_value} ml" if size_value is not None else None

    return {
        "name": product["name"],
        "url": full_url,
        "size": size,
        "price_final": product["price_range"]["minimum_price"]["final_price"],
        "price_regular": product["price_range"]["minimum_price"]["regular_price"],
    }


if __name__ == "__main__":
    phrase = input("Bottle name to search on SAQ: ").strip()
    result = get_first_saq_url(phrase)

    if result is None:
        print("No products found.")
    else:
        print("Best match:")
        print("Name:", result["name"])
        print("URL:", result["url"])
        if result["size"]:
            print("Size:", result["size"])
        print(
            "Final price:",
            result["price_final"]["value"],
            result["price_final"]["currency"],
        )

