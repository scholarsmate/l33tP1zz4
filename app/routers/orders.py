# app/routers/orders.py

"""
This module defines the routes for managing pizza orders.
"""

import logging
import os
from typing import List

from fastapi import APIRouter, HTTPException, Request, status, WebSocket
from fastapi.encoders import jsonable_encoder
from starlette.templating import Jinja2Templates
from starlette.websockets import WebSocketDisconnect

from app.connections.connection_manager import get_connection_manager
from app.database.db import db
from app.models.pizza import (
    OrderCreate,
    Order,
    PriceRequest,
)

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.on_event("startup")
async def startup() -> None:
    """
    This event handler is called when the application starts up.
    """
    await db.connect()


@router.on_event("shutdown")
async def shutdown() -> None:
    """
    This event handler is called when the application shuts down.
    """
    await db.close()


@router.get("/api/version")
def get_version():
    """
    This route returns the application version.
    """
    return os.getenv("APP_VERSION", "0.0.0")


async def get_pending_orders() -> List[dict]:
    """
    This function fetches all pending orders from the database.
    """
    try:
        sql = """
            SELECT
                o.order_id,
                o.order_name,
                o.phone_number,
                o.total_price,
                o.status,
                o.created_at,
                ps.name AS size_name,
                pss.name AS style_name,
                array_agg(t.name) AS toppings
            FROM orders o
            INNER JOIN pizza_sizes ps ON o.size_id = ps.id
            INNER JOIN pizza_styles pss ON o.style_id = pss.id
            LEFT JOIN order_toppings ot ON o.order_id = ot.order_id
            LEFT JOIN toppings t ON ot.topping_id = t.id
            WHERE o.status = 'Pending'
            GROUP BY o.order_id, ps.name, pss.name, o.created_at
            ORDER BY o.created_at DESC
        """
        orders = await db.fetch(sql)
        # Prepare orders for JSON serialization
        return [
            {
                "order_id": order["order_id"],
                "order_name": order["order_name"],
                "phone_number": order["phone_number"],
                "total_price": float(order["total_price"]),  # Convert Decimal to float
                "status": order["status"],
                "created_at": order[
                    "created_at"
                ].isoformat(),  # Convert datetime to string
                "size_name": order["size_name"],
                "style_name": order["style_name"],
                "toppings": order["toppings"],
            }
            for order in orders
        ]
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


async def get_sizes() -> List[dict]:
    """
    This function fetches all pizza sizes from the database.
    """
    try:
        sizes = await db.fetch("SELECT * FROM pizza_sizes")
        return [
            {
                "id": record["id"],
                "name": record["name"],
                "price": record["price"],
            }
            for record in sizes
        ]
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


async def get_styles() -> List[dict]:
    """
    This function fetches all pizza styles from the database.
    """
    query = "SELECT * FROM pizza_styles"
    styles = await db.fetch(query)
    return [
        {
            "id": record["id"],
            "name": record["name"],
            "price": record["price"],
        }
        for record in styles
    ]


async def get_toppings() -> List[dict]:
    """
    This function fetches all toppings from the database.
    """
    query = "SELECT * FROM toppings"
    toppings = await db.fetch(query)
    return [
        {
            "id": record["id"],
            "name": record["name"],
            "price": record["price"],
        }
        for record in toppings
    ]


@router.post("/api/orders/", response_model=Order, status_code=status.HTTP_201_CREATED)
async def add_order(order: OrderCreate) -> dict:
    """
    This route creates a new order in the database.
    """
    try:
        # Calculate total price
        total_price = await calculate_order_price(
            order.size_id, order.style_id, order.toppings
        )
        # Ensure total_price is a float, as Pydantic's default JSON encoder does not handle Decimal
        total_price = float(total_price) if total_price is not None else 0.0

        # Insert the order
        order_query = """
        INSERT INTO orders (order_name, phone_number, size_id, style_id, total_price, status)
        VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *
        """
        new_order = await db.fetchrow(
            order_query,
            order.order_name,
            order.phone_number,
            order.size_id,
            order.style_id,
            total_price,
        )

        # Check if new_order is None (insertion failed)
        if not new_order:
            raise HTTPException(status_code=500, detail="Failed to create order.")

        # Insert toppings into the junction table
        if order.toppings:
            toppings_query = (
                "INSERT INTO order_toppings (order_id, topping_id) VALUES ($1, $2)"
            )
            for topping_id in order.toppings:
                await db.execute(toppings_query, new_order["order_id"], topping_id)

        # Convert new_order record to dict if necessary
        order_data = dict(new_order)

        # Convert Decimal and datetime if not automatically handled
        order_data["total_price"] = float(order_data["total_price"])
        order_data["created_at"] = order_data["created_at"]

        await notify_clients_about_order_update()

        # Return the order data
        return order_data
    except Exception as error:
        logging.error("Error creating order: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


async def calculate_order_price(
    size_id: int, style_id: int, toppings: List[int]
) -> float:
    """
    This function calculates the total price of an order based on the pizza size, style,
    and toppings.
    """
    price_query = """
SELECT 
    pizza_sizes.price + pizza_styles.price + COALESCE(SUM(toppings.price), 0) AS total_price
FROM 
    pizza_sizes
JOIN 
    pizza_styles ON pizza_styles.id = $3
LEFT JOIN 
    toppings ON toppings.id = ANY($1::int[])
WHERE 
    pizza_sizes.id = $2
GROUP BY 
    pizza_sizes.price, pizza_styles.price
    """
    total_price = await db.fetchval(price_query, toppings, size_id, style_id)
    return total_price if total_price is not None else 0.0


@router.post("/api/calculate-price/", response_model=dict)
async def calculate_price(request: PriceRequest) -> dict:
    """
    This route calculates the total price of an order based on the pizza size, style, and toppings.
    """
    try:
        total_price = await calculate_order_price(
            request.size_id, request.style_id, request.toppings
        )
        # Ensure total_price is sent as a float, not a string
        return {"total_price": float(total_price)}  # Explicitly convert to float
    except Exception as error:
        logging.error("Error calculating price: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/", include_in_schema=False)
async def get_order_form(request: Request) -> templates.TemplateResponse:
    """
    This route returns the populated order form template.
    """
    return templates.TemplateResponse(
        "order_form.j2",
        {
            "request": request,
            "app_version": get_version(),
            "pizza_sizes": await get_sizes(),
            "pizza_styles": await get_styles(),
            "toppings": await get_toppings(),
        },
    )


@router.get("/orders", include_in_schema=False)
async def get_orders_page(request: Request) -> templates.TemplateResponse:
    """
    This route returns the populated order view template.
    """
    return templates.TemplateResponse(
        "order_view.j2",
        {
            "request": request,
            "app_version": get_version(),
            "orders": await get_pending_orders(),
        },
    )


@router.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    """
    This route handles WebSocket connections for order updates.
    """
    manager = get_connection_manager()
    await manager.connect(websocket)
    logging.debug("WebSocket connected.")
    try:
        # Send initial orders list upon connection
        initial_orders = await get_pending_orders()
        logging.debug("Sending initial orders: %s", initial_orders)
        await websocket.send_json(jsonable_encoder({"orders": initial_orders}))
        logging.debug("Sent initial orders")

        # Continue to listen for changes or client messages
        while True:
            # You might want to listen to some client messages here
            try:
                data = await websocket.receive_text()
                # Example: handle different types of messages
                # This is where you could integrate more complex interactions
                await manager.broadcast_json(jsonable_encoder({"Echo": data}))
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        logging.debug("WebSocket disconnected.")
    except Exception as error:
        logging.error("Error in WebSocket: %s", error)
    finally:
        logging.debug("Cleaning up WebSocket connection.")
        await manager.disconnect(websocket)


async def notify_clients_about_order_update():
    """
    This function notifies all connected clients about an order update.
    """
    try:
        logging.debug("Notifying clients about order update")
        await get_connection_manager().broadcast_json(
            jsonable_encoder({"orders": await get_pending_orders()})
        )
    except Exception as error:
        logging.error("Failed to notify clients about order update: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/api/orders/{order_id}/complete")
async def complete_order(order_id: int):
    """
    This route marks an order as completed.
    """
    await db.execute(
        "UPDATE orders SET status = 'Completed' WHERE order_id = $1", order_id
    )
    await notify_clients_about_order_update()
    return {"message": "Order completed"}


@router.post("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: int):
    """
    This route marks an order as canceled.
    """
    await db.execute(
        "UPDATE orders SET status = 'Canceled' WHERE order_id = $1", order_id
    )
    await notify_clients_about_order_update()
    return {"message": "Order canceled"}
