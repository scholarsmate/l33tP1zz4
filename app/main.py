# app/main.py

"""
This module defines the FastAPI application and includes the "orders" router.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.routers import orders

DEVELOPMENT = True

app = FastAPI()

app.include_router(orders.router)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


class AddStaticCacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add Cache-Control header to static files.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            if DEVELOPMENT:
                response.headers["Cache-Control"] = "no-cache"
            else:
                response.headers["Cache-Control"] = "public, max-age=604800"  # 1 week
        return response


# Add middleware to the application
app.add_middleware(AddStaticCacheControlMiddleware)
