# src/saq_ingest.py
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func

from .cocktail_db import SessionLocal, Ingredient, Base
from .saq import get_first_saq_product


class SaqProduct(Base):
    __tablename__ = "saq_product"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    ingredient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ingredient.id", ondelete="CASCADE"),
        nullable=False,
    )
    phrase = Column(Text, nullable=False)
    saq_name = Column(Text)
    saq_url = Column(Text)
    size = Column(Text)
    price_final_value = Column(Numeric(10, 2))
    price_final_currency = Column(Text)
    price_regular_value = Column(Numeric(10, 2))
    price_regular_currency = Column(Text)
    last_checked = Column(DateTime(timezone=True), server_default=func.now())


def run_saq_ingest():
    db: Session = SessionLocal()
    try:
        # DEBUG 1: see what DB we're connected to
        print("Connected to DB:", db.bind.url)

        # IMPORTANT: for now, hit ALL ingredients (no abv filter)
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
            print(f"\n[{datetime.utcnow()}] Looking up SAQ for {phrase!r} (id={ing.id})")

            try:
                product = get_first_saq_product(phrase)
            except Exception as e:
                print(f"  ERROR calling SAQ for {phrase!r}: {e}")
                continue

            if product is None:
                print("  No product found on SAQ for this phrase.")
            else:
                print("  Got product:")
                print(f"    name: {product['name']}")
                print(f"    url:  {product['url']}")
                print(f"    size: {product['size']}")
                print(f"    final price: {product['price_final_value']} {product['price_final_currency']}")

            existing = (
                db.query(SaqProduct)
                .filter(SaqProduct.ingredient_id == ing.id)
                .one_or_none()
            )

            now = datetime.utcnow()

            if product is None:
                if existing:
                    print("  Updating existing saq_product row with no result.")
                    existing.phrase = phrase
                    existing.saq_name = None
                    existing.saq_url = None
                    existing.size = None
                    existing.price_final_value = None
                    existing.price_final_currency = None
                    existing.price_regular_value = None
                    existing.price_regular_currency = None
                    existing.last_checked = now
                else:
                    print("  Inserting new saq_product row with no result.")
                    db.add(
                        SaqProduct(
                            ingredient_id=ing.id,
                            phrase=phrase,
                            saq_name=None,
                            saq_url=None,
                            size=None,
                            price_final_value=None,
                            price_final_currency=None,
                            price_regular_value=None,
                            price_regular_currency=None,
                            last_checked=now,
                        )
                    )
            else:
                if existing:
                    print("  Updating existing saq_product row with product data.")
                    existing.phrase = phrase
                    existing.saq_name = product["name"]
                    existing.saq_url = product["url"]
                    existing.size = product["size"]
                    existing.price_final_value = product["price_final_value"]
                    existing.price_final_currency = product["price_final_currency"]
                    existing.price_regular_value = product["price_regular_value"]
                    existing.price_regular_currency = product["price_regular_currency"]
                    existing.last_checked = now
                else:
                    print("  Inserting new saq_product row with product data.")
                    db.add(
                        SaqProduct(
                            ingredient_id=ing.id,
                            phrase=phrase,
                            saq_name=product["name"],
                            saq_url=product["url"],
                            size=product["size"],
                            price_final_value=product["price_final_value"],
                            price_final_currency=product["price_final_currency"],
                            price_regular_value=product["price_regular_value"],
                            price_regular_currency=product["price_regular_currency"],
                            last_checked=now,
                        )
                    )

            db.commit()
            print("  Commit successful.")

    finally:
        db.close()


if __name__ == "__main__":
    run_saq_ingest()

