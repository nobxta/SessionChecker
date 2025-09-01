from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    zip_handler,
    validator,
    health,
    name,
    bio,
    pfp,
    login_code,
    auth_code,
    stream,
    folder_join
)
from utils.websocket_manager import websocket_manager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Session Web 2.0 API",
    description="API for managing Telegram sessions and performing various operations",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zip_handler.router, prefix="/zip", tags=["zip"])
app.include_router(validator.router, prefix="/validate", tags=["validation"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(name.router, prefix="/name", tags=["name"])
app.include_router(bio.router, prefix="/bio", tags=["bio"])
app.include_router(pfp.router, prefix="/pfp", tags=["profile_picture"])
app.include_router(login_code.router, prefix="/login_code", tags=["login_code"])
app.include_router(auth_code.router, prefix="/auth_code", tags=["auth_code"])
app.include_router(stream.router, prefix="/stream", tags=["stream"])
app.include_router(folder_join.router, prefix="/folder", tags=["folder"])

# WebSocket endpoint for real-time updates
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    
    try:
        # Send initial connection message
        await websocket.send_text('{"type": "info", "message": "Connected to Session Web 2.0 WebSocket"}')
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await websocket.receive_text()
                # Handle incoming messages if needed
                logger.info(f"Received WebSocket message: {data}")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        logger.info("WebSocket connection closed")

# WebSocket endpoint with task ID
@app.websocket("/ws/{task_id}")
async def websocket_task_endpoint(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for specific task updates"""
    await websocket_manager.connect_client(websocket, task_id)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Session Web 2.0 API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "zip": "/zip",
            "validation": "/validate",
            "health": "/health",
            "name": "/name",
            "bio": "/bio",
            "profile_picture": "/pfp",
            "login_code": "/login_code",
            "auth_code": "/auth_code",
            "stream": "/stream",
            "folder": "/folder",
            "websocket": "/ws/{task_id}"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Session Web 2.0 API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 