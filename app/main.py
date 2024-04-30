from fastapi import FastAPI
from routers import orders
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.include_router(orders.router)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
