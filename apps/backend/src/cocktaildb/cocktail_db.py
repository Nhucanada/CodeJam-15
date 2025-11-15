# cocktail_db.py
import os

from sqlalchemy import (
    create_engine,
    Column,
    Text,
    Numeric,
    Boolean,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

# --------------------------------------------------------------------
# 1) DB URL from env (with optional fallback)
# --------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.lmltyadxwomdzqkmydmd:Ryanzhaomcgill1@aws-1-us-east-2.pooler.supabase.com:5432/postgres",
)
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in environment and no fallback provided")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --------------------------------------------------------------------
# MODELS – aligned to your latest Supabase schema
# --------------------------------------------------------------------


class Cocktail(Base):
    """
    Table: cocktail
      id          uuid PK
      created_at  timestamptz
      name        text
      type        varchar
      description text
      has_ice     bool
    """

    __tablename__ = "cocktail"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    name = Column(Text, nullable=False)
    type = Column(Text, nullable=False)  # 'classic' | 'house favourite'
    description = Column(Text)
    has_ice = Column(Boolean, nullable=False, default=False)

    ingredients = relationship(
        "CocktailIngredient",
        back_populates="cocktail",
        cascade="all, delete-orphan",
    )
    garnishes = relationship(
        "CocktailGarnish",
        back_populates="cocktail",
        cascade="all, delete-orphan",
    )


class Ingredient(Base):
    """
    Table: ingredient
      id            uuid PK
      name          text
      created_at    timestamptz
      abv           numeric
      flavour_profile text
      hexcode       text
    """

    __tablename__ = "ingredient"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    abv = Column(Numeric(5, 2))
    flavour_profile = Column(Text)
    hexcode = Column(Text)

    cocktails = relationship(
        "CocktailIngredient",
        back_populates="ingredient",
        cascade="all, delete-orphan",
    )


class Garnish(Base):
    """
    Table: garnish
      id         uuid PK
      created_at timestamptz
      name       text
    (Asset is stored in garnish_to_asset with same id)
    """

    __tablename__ = "garnish"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    name = Column(Text, nullable=False)

    cocktails = relationship(
        "CocktailGarnish",
        back_populates="garnish",
        cascade="all, delete-orphan",
    )

    # one-to-one with garnish_to_asset (id reused)
    asset = relationship(
        "GarnishToAsset",
        back_populates="garnish",
        uselist=False,
    )


class GarnishToAsset(Base):
    """
    Table: garnish_to_asset
      id    uuid PK (== garnish.id)
      asset text (url or path)
    """

    __tablename__ = "garnish_to_asset"

    id = Column(
        UUID(as_uuid=True),
        ForeignKey("garnish.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    asset = Column(Text, nullable=False)

    garnish = relationship("Garnish", back_populates="asset")


class Glass(Base):
    """
    Table: glass
      id         uuid PK
      name       text
      created_at timestamptz
    (e.g. 'highball_glass_7', etc.)
    """

    __tablename__ = "glass"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship(
        "GlassToAsset",
        back_populates="glass",
        uselist=False,
    )


class GlassToAsset(Base):
    """
    Table: glass_to_asset
      id    uuid PK (== glass.id)
      asset text
    """

    __tablename__ = "glass_to_asset"

    id = Column(
        UUID(as_uuid=True),
        ForeignKey("glass.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    asset = Column(Text, nullable=False)

    glass = relationship("Glass", back_populates="asset")


class CocktailIngredient(Base):
    """
    Table: cocktail_ingredient
      cocktail_id   uuid FK -> cocktail.id
      ingredient_id uuid FK -> ingredient.id
      created_at    timestamptz
      unit          text
      quantity      numeric
    """

    __tablename__ = "cocktail_ingredient"

    cocktail_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cocktail.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ingredient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ingredient.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    unit = Column(Text)
    quantity = Column(Numeric(5, 2))

    cocktail = relationship("Cocktail", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="cocktails")


class CocktailGarnish(Base):
    """
    Table: cocktail_garnish
      cocktail_id uuid FK -> cocktail.id
      garnish_id  uuid FK -> garnish.id
      created_at  timestamptz
      description text
    """

    __tablename__ = "cocktail_garnish"

    cocktail_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cocktail.id", ondelete="CASCADE"),
        primary_key=True,
    )
    garnish_id = Column(
        UUID(as_uuid=True),
        ForeignKey("garnish.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(Text)

    cocktail = relationship("Cocktail", back_populates="garnishes")
    garnish = relationship("Garnish", back_populates="cocktails")


class ReusePattern(Base):
    """
    Table: reuse_patterns
      id          uuid PK
      created_at  timestamptz
      description json
      name        text
    """

    __tablename__ = "reuse_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(JSONB)
    name = Column(Text, nullable=False)

