# app/main.py

"""
This module defines the FastAPI application and includes the orders router.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import orders

app = FastAPI()

app.include_router(orders.router)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
