from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Global WebSocket connection manager
class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
        logger.info(f"WebSocket connected for task {task_id}")

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info(f"WebSocket disconnected from task {task_id}")

    async def broadcast_to_task(self, message: str, task_id: str):
        if task_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[task_id]:
                try:
                    await connection.send_text(json.dumps({
                        "type": "log",
                        "message": message,
                        "timestamp": str(datetime.now())
                    }))
                except Exception as e:
                    logger.error(f"Failed to send message to WebSocket: {e}")
                    dead_connections.append(connection)
            
            # Remove dead connections
            for dead_conn in dead_connections:
                self.active_connections[task_id].remove(dead_conn)

ws_manager = WebSocketManager()

@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket, task: str = "default"):
    """
    WebSocket endpoint for real-time task progress streaming
    """
    await ws_manager.connect(websocket, task)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle any incoming messages if needed
                logger.info(f"Received message from task {task}: {message}")
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from task {task}")
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, task)
    except Exception as e:
        logger.error(f"WebSocket error for task {task}: {e}")
        ws_manager.disconnect(websocket, task)

# Export the manager for use in other modules
def get_ws_manager():
    return ws_manager 