# app/connection_manager.py

from typing import List
from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        await websocket.close()
        self.active_connections.remove(websocket)

    async def broadcast_json(self, data):
        for connection in self.active_connections:
            if connection.client_state == WebSocketState.CONNECTED:
                await connection.send_json(data)
            else:
                print(f"Connection {connection} not ready for JSON messages")

    async def broadcast_text(self, data: str):
        for connection in self.active_connections:
            if connection.client_state == WebSocketState.CONNECTED:
                await connection.send_text(data)
            else:
                print(f"Connection {connection} not ready for text messages")


# Initialize the connection manager
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """
    This function returns the connection manager object
    :return: ConnectionManager
    """
    return manager
