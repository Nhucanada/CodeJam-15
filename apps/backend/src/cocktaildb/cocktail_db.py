# cocktail_db.py
import os
from sqlalchemy import (
    create_engine, Column, BigInteger, Text, Numeric, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# 1) Get DB URL from env
DATABASE_URL = os.getenv("postgresql://postgres.lmltyadxwomdzqkmydmd:Ryanzhaomcgill1@aws-1-us-east-2.pooler.supabase.com:5432/postgres")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in environment")

# 2) Engine + Session factory
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3) Base for models
Base = declarative_base()


# 4) Models that match your Supabase tables
class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    abv = Column(Numeric(5, 2))
    flavour_profile = Column(Text)

    cocktails = relationship("CocktailIngredient", back_populates="ingredient")


class Cocktail(Base):
    __tablename__ = "cocktails"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    type = Column(Text, nullable=False)  # 'classic' or 'house favourite'
    recipe = Column(Text)

    ingredients = relationship("CocktailIngredient", back_populates="cocktail")


class CocktailIngredient(Base):
    __tablename__ = "cocktail_ingredients"

    cocktail_id = Column(
        BigInteger,
        ForeignKey("cocktails.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ingredient_id = Column(
        BigInteger,
        ForeignKey("ingredients.id", ondelete="CASCADE"),
        primary_key=True,
    )
    quantity = Column(Numeric(5, 2))
    unit = Column(Text)

    cocktail = relationship("Cocktail", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="cocktails")


class ReusePattern(Base):
    __tablename__ = "reuse_patterns"

    id = Column(BigInteger, primary_key=True, index=True)
    pattern = Column(Text, nullable=False)
    description = Column(Text)
