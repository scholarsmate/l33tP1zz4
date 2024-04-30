# app/connections/connection_manager.py

"""
This module manages WebSocket connections for the application,
allowing for real-time communication between the server and clients.
"""

from typing import List

from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:
    """
    Manages active WebSocket connections to broadcast messages to all connected clients.
    """

    def __init__(self):
        """
        Initializes the ConnectionManager with an empty list of active connections.
        """
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Accepts a WebSocket connection and adds it to the list of active connections.
        """
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        """
        Removes a WebSocket connection from the list of active connections and closes it.
        """
        await websocket.close()
        self.active_connections.remove(websocket)

    async def broadcast_json(self, data):
        """
        Sends data as JSON to all active WebSocket connections.
        """
        for connection in self.active_connections:
            if connection.client_state == WebSocketState.CONNECTED:
                await connection.send_json(data)
            else:
                print(f"Connection {connection} not ready for JSON messages")

    async def broadcast_text(self, data: str):
        """
        Sends data as text to all active WebSocket connections.
        """
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
