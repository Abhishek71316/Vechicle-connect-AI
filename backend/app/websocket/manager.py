# Smart Vehicles connect AI - WebSocket Manager
# Manages WebSocket connections for real-time communication

from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.esp32_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if client_id:
            self.esp32_connections[client_id] = websocket
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, client_id: str = None):
        self.active_connections.remove(websocket)
        if client_id and client_id in self.esp32_connections:
            del self.esp32_connections[client_id]
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

    async def send_to_client(self, websocket: WebSocket, message: dict):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except:
            pass

    async def send_to_esp32(self, client_id: str, message: dict):
        """Send message to specific ESP32 client"""
        if client_id in self.esp32_connections:
            try:
                await self.esp32_connections[client_id].send_json(message)
            except:
                pass

manager = ConnectionManager()
