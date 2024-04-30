# app/models/pizza.py

"""
This module defines Pydantic models for Pizza Shop related data.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class PriceRequest(BaseModel):
    """
    Pydantic model for an order price request.
    """

    size_id: int
    style_id: int
    toppings: List[int] = []


class OrderCreate(BaseModel):
    """
    Pydantic model for creating an order.
    """

    order_name: str
    phone_number: str
    size_id: int
    style_id: int
    toppings: Optional[List[int]] = (
        []
    )  # toppings are optional, default to an empty list


class Order(OrderCreate):
    """
    Pydantic model for an order.
    """

    order_id: int
    status: str = "Pending"
    created_at: datetime

    class Config:
        """
        Pydantic configuration for the Order model.
        """

        from_attributes = True
