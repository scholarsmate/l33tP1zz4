# app/routers/orders.py

"""
This module defines the routes for managing pizza orders.
"""

import logging
import os
from enum import Enum
from typing import List

from fastapi import APIRouter, HTTPException, Request, status, WebSocket, Query
from fastapi.encoders import jsonable_encoder
from starlette.templating import Jinja2Templates
from starlette.websockets import WebSocketDisconnect

from app.connections.connection_manager import get_connection_manager
from app.database.db import get_database
from app.models.pizza import OrderCreate, Order, Price, Message, Count, Item, OrderInfo


class OrderStatus(str, Enum):
    """
    Enumeration for order status.
    """

    PENDING = "pending"
    COMPLETED = "completed"
    CANCELED = "canceled"


router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.on_event("startup")
async def startup() -> None:
    """
    This event handler is called when the application starts up.
    """
    await get_database().connect()


@router.on_event("shutdown")
async def shutdown() -> None:
    """
    This event handler is called when the application shuts down.
    """
    await get_database().close()


@router.get("/api/version", response_model=str)
def get_version() -> str:
    """
    This route returns the application version.
    """
    return os.getenv("APP_VERSION", "0.0.0")


@router.get("/api/connection-count", response_model=Count)
async def get_connection_count() -> dict:
    """
    This route returns the number of active WebSocket connections.
    """
    return {"count": get_connection_manager().connection_count()}


@router.get("/api/orders", response_model=List[OrderInfo])
async def get_orders(order_status: OrderStatus = "pending") -> List[dict]:
    """
    This function fetches all pending orders from the database.
    """
    try:
        sql = """
            SELECT
                o.order_id,
                o.order_name,
                o.phone_number,
                o.price,
                o.status,
                o.created_at,
                o.updated_at,
                ps.name AS size_name,
                pss.name AS style_name,
                array_agg(t.name) AS toppings
            FROM orders o
            INNER JOIN pizza_sizes ps ON o.size_id = ps.id
            INNER JOIN pizza_styles pss ON o.style_id = pss.id
            LEFT JOIN order_toppings ot ON o.order_id = ot.order_id
            LEFT JOIN toppings t ON ot.topping_id = t.id
            WHERE o.status = $1
            GROUP BY o.order_id, ps.name, pss.name, o.created_at
            ORDER BY o.created_at
        """
        orders = await get_database().fetch(sql, order_status)
        # Prepare orders for JSON serialization
        return [
            {
                "order_id": order["order_id"],
                "order_name": order["order_name"],
                "phone_number": order["phone_number"],
                "price": float(order["price"]),  # Convert Decimal to float
                "status": order["status"],
                "created_at": order[
                    "created_at"
                ].isoformat(),  # Convert datetime to string
                "updated_at": order[
                    "updated_at"
                ].isoformat(),  # Convert datetime to string
                "size_name": order["size_name"],
                "style_name": order["style_name"],
                "toppings": order["toppings"],
            }
            for order in orders
        ]
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/api/sizes", response_model=List[Item])
async def get_sizes() -> List[dict]:
    """
    This function fetches all pizza sizes from the database.
    """
    try:
        sizes = await get_database().fetch("SELECT * FROM pizza_sizes")
        return [
            {
                "id": record["id"],
                "name": record["name"],
                "price": record["price"],
            }
            for record in sizes
        ]
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/api/styles", response_model=List[Item])
async def get_styles() -> List[dict]:
    """
    This function fetches all pizza styles from the database.
    """
    query = "SELECT * FROM pizza_styles"
    styles = await get_database().fetch(query)
    return [
        {
            "id": record["id"],
            "name": record["name"],
            "price": record["price"],
        }
        for record in styles
    ]


@router.get("/api/toppings", response_model=List[Item])
async def get_toppings() -> List[dict]:
    """
    This function fetches all toppings from the database.
    """
    query = "SELECT * FROM toppings ORDER BY name"
    toppings = await get_database().fetch(query)
    return [
        {
            "id": record["id"],
            "name": record["name"],
            "price": record["price"],
        }
        for record in toppings
    ]


@router.post("/api/orders", response_model=Order, status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderCreate) -> dict:
    """
    This route creates a new order in the database.
    """
    try:
        # Calculate order price
        price = await get_order_price(order.size_id, order.style_id, order.toppings)
        # Ensure total_price is a float, as Pydantic's default JSON encoder does not handle Decimal
        price = float(price) if price is not None else 0.0

        # Insert the order
        order_query = """
        INSERT INTO orders (order_name, phone_number, size_id, style_id, price)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
        """
        new_order = await get_database().fetchrow(
            order_query,
            order.order_name,
            order.phone_number,
            order.size_id,
            order.style_id,
            price,
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
                await get_database().execute(
                    toppings_query, new_order["order_id"], topping_id
                )

        # Convert new_order record to dict if necessary
        order_data = dict(new_order)

        # Convert Decimal and datetime if not automatically handled
        order_data["price"] = float(order_data["price"])

        await notify_clients_about_order_update()

        # Return the order data
        return order_data
    except Exception as error:
        logging.error("Error creating order: %s", error)
        raise HTTPException(status_code=500, detail=str(error)) from error


async def get_order_price(size_id: int, style_id: int, toppings: List[int]) -> float:
    """
    This function calculates the total price of an order based on the pizza size, style,
    and toppings.
    """
    price_query = """
SELECT 
    pizza_sizes.price + pizza_styles.price + COALESCE(SUM(toppings.price), 0) AS price
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
    price = await get_database().fetchval(price_query, toppings, size_id, style_id)
    return price if price is not None else 0.0


@router.get("/api/price", response_model=Price)
async def calculate_price(
    size_id: int, style_id: int, toppings: List[int] = Query([])
) -> dict:
    """
    This route calculates the total price of an order based on the pizza size, style, and toppings.
    It receives parameters as query strings.
    """
    try:
        price = await get_order_price(size_id, style_id, toppings)
        return {"price": float(price)}
    except Exception as error:
        logging.error("Error calculating price: %s", error)
        raise HTTPException(status_code=500, detail=str(error)) from error


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
            "orders_pending": await get_orders(),
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
        logging.debug("Sending initial orders")
        await websocket.send_json(
            jsonable_encoder({"orders_pending": await get_orders()})
        )
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
            jsonable_encoder({"orders_pending": await get_orders()})
        )
    except Exception as error:
        logging.error("Failed to notify clients about order update: %s", error)
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.patch("/api/orders/{order_id}", response_model=Message)
async def update_order(order_id: int, order_status: OrderStatus) -> dict:
    """
    This route updates the status of an order.
    """
    try:
        await get_database().execute(
            "UPDATE orders SET status = $2, updated_at = now() WHERE order_id = $1",
            order_id,
            order_status,
        )
    except Exception as error:
        logging.error("Error updating order: %s", error)
        raise HTTPException(status_code=500, detail=str(error)) from error

    await notify_clients_about_order_update()
    return {"message": f"Order #{order_id} {order_status.lower()}"}
