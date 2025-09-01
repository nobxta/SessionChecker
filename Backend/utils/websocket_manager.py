"""
WebSocket Manager for Backend
Handles real-time updates and live progress reporting
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum

logger = logging.getLogger(__name__)

def safe_dict(d):
    """Safely return a dictionary, or empty dict if None/invalid"""
    return d if isinstance(d, dict) else {}

class MessageType(Enum):
    """Types of WebSocket messages"""
    PROGRESS = "progress"
    STATUS = "status"
    RESULT = "result"
    ERROR = "error"
    COMPLETE = "complete"
    INFO = "info"
    WARNING = "warning"

class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.task_connections: Dict[str, List[str]] = {}  # task_id -> [connection_ids]
        self.connection_tasks: Dict[str, str] = {}  # connection_id -> task_id
        
    async def connect(self, websocket: WebSocket, task_id: str):
        """Connect a new WebSocket client"""
        await websocket.accept()
        
        connection_id = f"conn_{len(self.active_connections)}_{datetime.now().timestamp()}"
        self.active_connections[connection_id] = websocket
        self.connection_tasks[connection_id] = task_id
        
        if task_id not in self.task_connections:
            self.task_connections[task_id] = []
        self.task_connections[task_id].append(connection_id)
        
        logger.info(f"WebSocket connected: {connection_id} for task: {task_id}")
        
        # Send welcome message
        await self.send_personal_message(connection_id, {
            "type": "info",
            "message": "Connected to Session Web 2.0",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat()
        })
        
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Disconnect a WebSocket client"""
        if connection_id in self.active_connections:
            task_id = self.connection_tasks.get(connection_id)
            
            # Remove from active connections
            del self.active_connections[connection_id]
            del self.connection_tasks[connection_id]
            
            # Remove from task connections
            if task_id and task_id in self.task_connections:
                self.task_connections[task_id].remove(connection_id)
                if not self.task_connections[task_id]:
                    del self.task_connections[task_id]
            
            logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_personal_message(self, connection_id: str, message: Dict[str, Any]):
        """Send message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def broadcast_to_task(self, task_id: str, message: Dict[str, Any]):
        """Broadcast message to all connections for a specific task"""
        if task_id in self.task_connections:
            connection_ids = self.task_connections[task_id].copy()
            for connection_id in connection_ids:
                await self.send_personal_message(connection_id, message)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all active connections"""
        connection_ids = list(self.active_connections.keys())
        for connection_id in connection_ids:
            await self.send_personal_message(connection_id, message)

class ProgressTracker:
    """Tracks progress for long-running operations"""
    
    def __init__(self, manager: ConnectionManager, task_id: str):
        self.manager = manager
        self.task_id = task_id
        self.total_items = 0
        self.completed_items = 0
        self.current_operation = ""
        self.start_time = datetime.now()
        self.results = []
        self.errors = []
        
    async def update_progress(self, current: int, total: int, operation: str = ""):
        """Update progress and broadcast to task"""
        self.total_items = total
        self.completed_items = current
        self.current_operation = operation
        
        percentage = (current / total * 100) if total > 0 else 0
        
        message = {
            "type": MessageType.PROGRESS.value,
            "task_id": self.task_id,
            "progress": {
                "current": current,
                "total": total,
                "percentage": round(percentage, 1),
                "operation": operation
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await self.manager.broadcast_to_task(self.task_id, message)
    
    async def add_result(self, item_name: str, status: str, details: str = "", data: Dict = None):
        """Add a result and broadcast to task"""
        result = {
            "item": item_name,
            "status": status,
            "details": details,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        
        self.results.append(result)
        
        message = {
            "type": MessageType.RESULT.value,
            "task_id": self.task_id,
            "result": result
        }
        
        await self.manager.broadcast_to_task(self.task_id, message)
        
        # Update progress
        await self.update_progress(len(self.results), self.total_items, self.current_operation)
    
    async def add_error(self, item_name: str, error: str, error_type: str = "error"):
        """Add an error and broadcast to task"""
        error_result = {
            "item": item_name,
            "status": "error",
            "error": error,
            "error_type": error_type,
            "timestamp": datetime.now().isoformat()
        }
        
        self.errors.append(error_result)
        
        message = {
            "type": MessageType.ERROR.value,
            "task_id": self.task_id,
            "error": error_result
        }
        
        await self.manager.broadcast_to_task(self.task_id, message)
        
        # Update progress
        await self.update_progress(len(self.results) + len(self.errors), self.total_items, self.current_operation)
    
    async def complete(self, summary: Dict[str, Any] = None):
        """Mark operation as complete and broadcast summary"""
        duration = (datetime.now() - self.start_time).total_seconds()
        
        completion_message = {
            "type": MessageType.COMPLETE.value,
            "task_id": self.task_id,
            "summary": {
                "total_items": self.total_items,
                "completed": len(self.results),
                "errors": len(self.errors),
                "duration_seconds": round(duration, 2),
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                **safe_dict(summary)
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await self.manager.broadcast_to_task(self.task_id, completion_message)

class WebSocketManager:
    """Main WebSocket manager for the application"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.active_tasks: Dict[str, ProgressTracker] = {}
    
    async def connect_client(self, websocket: WebSocket, task_id: str):
        """Connect a new client"""
        connection_id = await self.connection_manager.connect(websocket, task_id)
        
        try:
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    await self.handle_message(connection_id, message)
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error handling message from {connection_id}: {e}")
                    await self.connection_manager.send_personal_message(connection_id, {
                        "type": "error",
                        "message": "Invalid message format",
                        "timestamp": datetime.now().isoformat()
                    })
        finally:
            self.connection_manager.disconnect(connection_id)
    
    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        message_type = message.get("type")
        
        if message_type == "ping":
            # Respond to ping with pong
            await self.connection_manager.send_personal_message(connection_id, {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            })
        elif message_type == "subscribe":
            # Subscribe to task updates
            task_id = message.get("task_id")
            if task_id:
                # Update connection's task association
                old_task_id = self.connection_manager.connection_tasks.get(connection_id)
                if old_task_id and old_task_id in self.connection_manager.task_connections:
                    self.connection_manager.task_connections[old_task_id].remove(connection_id)
                
                self.connection_manager.connection_tasks[connection_id] = task_id
                if task_id not in self.connection_manager.task_connections:
                    self.connection_manager.task_connections[task_id] = []
                self.connection_manager.task_connections[task_id].append(connection_id)
                
                await self.connection_manager.send_personal_message(connection_id, {
                    "type": "info",
                    "message": f"Subscribed to task: {task_id}",
                    "task_id": task_id,
                    "timestamp": datetime.now().isoformat()
                })
    
    def create_progress_tracker(self, task_id: str) -> ProgressTracker:
        """Create a new progress tracker for a task"""
        tracker = ProgressTracker(self.connection_manager, task_id)
        self.active_tasks[task_id] = tracker
        return tracker
    
    def get_progress_tracker(self, task_id: str) -> Optional[ProgressTracker]:
        """Get existing progress tracker for a task"""
        return self.active_tasks.get(task_id)
    
    def remove_progress_tracker(self, task_id: str):
        """Remove progress tracker for a task"""
        if task_id in self.active_tasks:
            del self.active_tasks[task_id]
    
    async def send_status_update(self, task_id: str, status: str, message: str, details: Dict = None):
        """Send a status update for a task"""
        status_message = {
            "type": MessageType.STATUS.value,
            "task_id": task_id,
            "status": status,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast_to_task(task_id, status_message)
    
    async def send_info_message(self, task_id: str, message: str, details: Dict = None):
        """Send an info message for a task"""
        info_message = {
            "type": MessageType.INFO.value,
            "task_id": task_id,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast_to_task(task_id, info_message)
    
    async def send_warning_message(self, task_id: str, message: str, details: Dict = None):
        """Send a warning message for a task"""
        warning_message = {
            "type": MessageType.WARNING.value,
            "task_id": task_id,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast_to_task(task_id, warning_message)

# Global WebSocket manager instance
websocket_manager = WebSocketManager()

# Convenience functions for easy access
async def send_progress_update(task_id: str, current: int, total: int, operation: str = ""):
    """Send progress update for a task"""
    tracker = websocket_manager.get_progress_tracker(task_id)
    if tracker:
        await tracker.update_progress(current, total, operation)

async def send_result_update(task_id: str, item_name: str, status: str, details: str = "", data: Dict = None):
    """Send result update for a task"""
    tracker = websocket_manager.get_progress_tracker(task_id)
    if tracker:
        await tracker.add_result(item_name, status, details, data)

async def send_error_update(task_id: str, item_name: str, error: str, error_type: str = "error"):
    """Send error update for a task"""
    tracker = websocket_manager.get_progress_tracker(task_id)
    if tracker:
        await tracker.add_error(item_name, error, error_type)

async def send_status_update(task_id: str, status: str, message: str, details: Dict = None):
    """Send status update for a task"""
    await websocket_manager.send_status_update(task_id, status, message, details)

async def send_info_message(task_id: str, message: str, details: Dict = None):
    """Send info message for a task"""
    await websocket_manager.send_info_message(task_id, message, details)

async def send_warning_message(task_id: str, message: str, details: Dict = None):
    """Send warning message for a task"""
    await websocket_manager.send_warning_message(task_id, message, details)

async def complete_task(task_id: str, summary: Dict[str, Any] = None):
    """Complete a task and send summary"""
    tracker = websocket_manager.get_progress_tracker(task_id)
    if tracker:
        await tracker.complete(summary)
        websocket_manager.remove_progress_tracker(task_id)
