# app/models/pizza.py

"""
This module defines Pydantic models for Pizza Shop related data.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class Message(BaseModel):
    """
    Pydantic model for a message.
    """

    message: str


class Count(BaseModel):
    """
    Pydantic model for a count.
    """

    count: int


class Price(BaseModel):
    """
    Pydantic model for a price.
    """

    price: float


class Item(Price):
    """
    Pydantic model for an item.
    """

    id: int
    name: str

    # config for the Item model
    class Config:
        """
        Pydantic model configuration.
        """

        # strip whitespace from name
        str_strip_whitespace = True


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

    # config for the OrderCreate model
    class Config:
        """
        Pydantic model configuration.
        """

        # strip whitespace from order_name and phone_number
        str_strip_whitespace = True


class Order(OrderCreate):
    """
    Pydantic model for an order.
    """

    order_id: int
    status: str = "pending"
    created_at: datetime
    updated_at: datetime

    # config for the Order model
    class Config:
        """
        Pydantic model configuration.
        """

        # look up the toppings from the database by ID
        from_attributes = True


class OrderInfo(BaseModel):
    """
    Pydantic model for an order with additional information.
    """

    order_id: int
    order_name: str
    phone_number: str
    size_name: str
    style_name: str
    toppings: List[str]
    price: float
    status: str
    created_at: datetime
    updated_at: datetime
