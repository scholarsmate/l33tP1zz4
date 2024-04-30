# app/models/pizza.py
# Description: Pydantic models for Pizza related data

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PriceRequest(BaseModel):
    size_id: int
    style_id: int
    toppings: List[int] = []


class OrderCreate(BaseModel):
    order_name: str
    phone_number: str
    size_id: int
    style_id: int
    toppings: Optional[List[int]] = (
        []
    )  # toppings are optional, default to an empty list


class Order(OrderCreate):
    order_id: int
    status: str = "Pending"
    created_at: datetime

    class Config:
        from_attributes = True
