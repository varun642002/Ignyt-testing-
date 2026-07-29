"""Request/response models for AI food scanning."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ScanStatusResponse(BaseModel):
    """What the client needs to decide whether to offer the scan button at all."""

    ai_configured: bool
    is_premium: bool
    daily_limit: int
    used_today: int
    remaining: int


class Nutrition(BaseModel):
    """Per 100 g, matching every other food record in the product."""

    calories: float
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fibre: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None


class RecognisedFood(BaseModel):
    name: str
    ingredients: List[str] = []
    serving_label: Optional[str] = None
    estimated_grams: float
    # How sure the vision model is that this IS this food.
    confidence: float = Field(ge=0, le=1)
    # Where the numbers came from. The UI shows "AI Estimated Nutrition" for `ai_estimate`
    # and lets the user edit before saving; a `community` match is shown as a known food.
    nutrition_source: str  # community | ai_estimate | none
    # Separate from `confidence`: how sure we are about the NUTRITION, which is a different
    # question from what the food is. A confident identification can still carry an
    # unconfident estimate.
    nutrition_confidence: Optional[float] = None
    nutrition: Optional[Nutrition] = None


class ScanResponse(BaseModel):
    foods: List[RecognisedFood]
    meal_type: Optional[str] = None
    remaining: int
    daily_limit: int


class ConfirmFoodRequest(BaseModel):
    """Saving an AI-estimated food after the user has reviewed and possibly edited it."""

    name: str = Field(min_length=1, max_length=255)
    calories: float = Field(ge=0, le=1200)          # per 100 g; pure fat is ~900
    protein: Optional[float] = Field(default=None, ge=0, le=100)
    carbs: Optional[float] = Field(default=None, ge=0, le=100)
    fat: Optional[float] = Field(default=None, ge=0, le=100)
    fibre: Optional[float] = Field(default=None, ge=0, le=100)
    sugar: Optional[float] = Field(default=None, ge=0, le=100)
    sodium: Optional[float] = Field(default=None, ge=0, le=100000)
    serving_grams: Optional[float] = Field(default=None, gt=0, le=5000)
    serving_label: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = Field(default=None, max_length=120)


class ConfirmFoodResponse(BaseModel):
    id: str
    name: str
    confirmations: int
