from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func

from cocktail_db import SessionLocal, Ingredient, Base
from saq import get_first_saq_url


class SaqProduct(Base):
    __tablename__ = "saq_product"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,  # generate UUID in Python
    )
    ingredient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ingredient.id", ondelete="CASCADE"),
        nullable=False,
    )
    phrase = Column(Text, nullable=False)
    saq_url = Column(Text)
    saq_name = Column(Text)
    saq_price = Column(Numeric(10, 2))  # matches saq_price numeric
    last_checked = Column(DateTime(timezone=True), server_default=func.now())
    size = Column(Text)  # matches size text


def _is_bottle_url(url: str | None) -> bool:
    """
    Heuristic: SAQ bottle product pages end with a numeric SKU, e.g. '/en/11639070'.
    Returns True only if the last path segment is all digits.
    """
    if not url:
        return False
    # Strip query string
    path = url.split("?", 1)[0]
    # Strip trailing slash and take last segment
    last_segment = path.rstrip("/").rsplit("/", 1)[-1]
    return last_segment.isdigit()


def run_saq_ingest():
    db: Session = SessionLocal()
    try:
        print("Connected to DB:", db.bind.url)

        # grab all ingredients (you can filter by abv later if you want)
        ingredients = (
            db.query(Ingredient)
            .order_by(Ingredient.name)
            .all()
        )
        print(f"Found {len(ingredients)} ingredients to process.")
        if not ingredients:
            print("No ingredients found – check your ingredient table.")
            return

        for ing in ingredients:
            phrase = ing.name
            now = datetime.now(timezone.utc)
            print(f"\n[{now.isoformat()}] Looking up SAQ for {phrase!r} (id={ing.id})")

            try:
                product = get_first_saq_url(phrase)
            except Exception as e:
                print(f"  ERROR calling SAQ for {phrase!r}: {e}")
                db.rollback()
                continue

            # existing row for this ingredient, if any
            existing = (
                db.query(SaqProduct)
                .filter(SaqProduct.ingredient_id == ing.id)
                .one_or_none()
            )

            # ---- VALIDATION LAYER: must be a bottle URL AND must have a price ----
            price_final_value = None
            if product is not None:
                # enforce bottle URL rule
                if not _is_bottle_url(product.get("url")):
                    print("  SAQ result is not a bottle page (URL does not end in digits). Treating as no result.")
                    product = None
                else:
                    # unpack final price from saq.py result
                    final = product.get("price_final") or {}
                    price_final_value = final.get("value")

                    if price_final_value is None:
                        print("  SAQ result has no final price. Treating as no result.")
                        product = None

            # ----------------------------------------------------------------------

            if product is None:
                print("  No product found on SAQ for this phrase (or result invalid).")

                if existing:
                    print("  Updating existing saq_product row with no result.")
                    existing.phrase = phrase
                    existing.saq_name = None
                    existing.saq_url = None
                    existing.saq_price = None
                    existing.size = None
                    existing.last_checked = now
                else:
                    print("  Inserting new saq_product row with no result.")
                    db.add(
                        SaqProduct(
                            ingredient_id=ing.id,
                            phrase=phrase,
                            saq_name=None,
                            saq_url=None,
                            saq_price=None,
                            size=None,
                            last_checked=now,
                        )
                    )

            else:
                # product is a valid bottle page with a non-null price_final_value
                print("  Got product:")
                print(f"    name: {product['name']}")
                print(f"    url:  {product['url']}")
                print(f"    size: {product['size']}")
                print(f"    final price: {price_final_value} (stored in saq_price)")

                if existing:
                    print("  Updating existing saq_product row with product data.")
                    existing.phrase = phrase
                    existing.saq_name = product["name"]
                    existing.saq_url = product["url"]
                    existing.saq_price = price_final_value
                    existing.size = product["size"]
                    existing.last_checked = now
                else:
                    print("  Inserting new saq_product row with product data.")
                    db.add(
                        SaqProduct(
                            ingredient_id=ing.id,
                            phrase=phrase,
                            saq_name=product["name"],
                            saq_url=product["url"],
                            saq_price=price_final_value,
                            size=product["size"],
                            last_checked=now,
                        )
                    )

            db.commit()
            print("  Commit successful.")

    finally:
        db.close()


if __name__ == "__main__":
    run_saq_ingest()

