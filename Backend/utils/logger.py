import logging
import json
from datetime import datetime
from typing import Optional
from routers.stream import get_ws_manager

logger = logging.getLogger(__name__)

async def log_to_websocket(message: str, task_id: str = "default", level: str = "info"):
    """
    Send log message to WebSocket clients
    """
    try:
        ws_manager = get_ws_manager()
        
        log_data = {
            "type": "log",
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "task_id": task_id
        }
        
        await ws_manager.broadcast_to_task(json.dumps(log_data), task_id)
        
    except Exception as e:
        logger.error(f"Failed to send log to WebSocket: {e}")

async def log_progress(task_id: str, current: int, total: int, message: str = ""):
    """
    Log progress update to WebSocket
    """
    try:
        ws_manager = get_ws_manager()
        
        progress_data = {
            "type": "progress",
            "current": current,
            "total": total,
            "percentage": int((current / total) * 100) if total > 0 else 0,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "task_id": task_id
        }
        
        await ws_manager.broadcast_to_task(json.dumps(progress_data), task_id)
        
    except Exception as e:
        logger.error(f"Failed to send progress to WebSocket: {e}")

async def log_error(task_id: str, error_message: str, session_name: str = ""):
    """
    Log error to WebSocket
    """
    await log_to_websocket(
        f"❌ {session_name}: {error_message}" if session_name else f"❌ {error_message}",
        task_id,
        "error"
    )

async def log_success(task_id: str, success_message: str, session_name: str = ""):
    """
    Log success to WebSocket
    """
    await log_to_websocket(
        f"✅ {session_name}: {success_message}" if session_name else f"✅ {success_message}",
        task_id,
        "success"
    )

async def log_info(task_id: str, info_message: str, session_name: str = ""):
    """
    Log info to WebSocket
    """
    await log_to_websocket(
        f"ℹ️ {session_name}: {info_message}" if session_name else f"ℹ️ {info_message}",
        task_id,
        "info"
    )

def setup_logging():
    """
    Setup logging configuration
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('session_manager.log')
        ]
    ) 