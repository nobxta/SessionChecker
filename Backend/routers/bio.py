from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List, Dict
import asyncio
import logging
from utils.session_utils import create_telegram_client
from utils.logger import log_to_websocket
from io import BytesIO
from telethon.tl.functions.account import UpdateProfileRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/set")
async def set_bios(
    files: List[UploadFile] = File(...),
    bio_text: str = Form(...)  # Bio text to set for all sessions
):
    """
    Set bio for multiple sessions
    """
    results = []
    
    for file in files:
        if not file.filename.endswith('.session'):
            continue
            
        try:
            session_content = await file.read()
            session_buffer = BytesIO(session_content)
            
            # Create Telegram client
            client = await create_telegram_client(session_buffer, file.filename)
            
            # Try to connect and update bio
            await client.connect()
            
            if await client.is_user_authorized():
                try:
                    # Update bio
                    me = await client.get_me()
                    await client(UpdateProfileRequest(
                        first_name=me.first_name or "",
                        last_name=me.last_name or "",
                        about=bio_text
                    ))
                    
                    results.append({
                        "session": file.filename,
                        "status": "success",
                        "old_bio": me.about,
                        "new_bio": bio_text,
                        "user_id": me.id
                    })
                    
                    await log_to_websocket(f"✅ {file.filename}: Bio updated to '{bio_text[:50]}...'")
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    # Determine specific error type for bio updates
                    if "flood" in error_msg or "wait" in error_msg:
                        error_type = "flood_wait"
                        error_description = "Rate limited - too many profile updates"
                    elif "banned" in error_msg or "blocked" in error_msg:
                        error_type = "banned"
                        error_description = "Account is banned or blocked"
                    elif "deleted" in error_msg or "removed" in error_msg:
                        error_type = "deleted"
                        error_description = "Account has been deleted"
                    elif "network" in error_msg or "connection" in error_msg:
                        error_type = "network_error"
                        error_description = "Network connection failed"
                    elif "about" in error_msg or "bio" in error_msg:
                        error_type = "bio_error"
                        error_description = "Invalid bio format or length"
                    else:
                        error_type = "update_error"
                        error_description = f"Bio update failed: {str(e)}"
                    
                    results.append({
                        "session": file.filename,
                        "status": "error",
                        "error_type": error_type,
                        "error": error_description,
                        "raw_error": str(e),
                        "user_id": None
                    })
                    await log_to_websocket(f"❌ {file.filename}: {error_description}")
            else:
                results.append({
                    "session": file.filename,
                    "status": "unauthorized",
                    "error": "Session not authorized",
                    "user_id": None
                })
                await log_to_websocket(f"❌ {file.filename}: Unauthorized session")
                
        except Exception as e:
            error_msg = str(e).lower()
            
            # Determine specific error type
            if "session" in error_msg and ("expired" in error_msg or "invalid" in error_msg):
                error_type = "session_expired"
                error_description = "Session file is expired or invalid"
            elif "flood" in error_msg or "wait" in error_msg:
                error_type = "flood_wait"
                error_description = "Rate limited - too many requests"
            elif "banned" in error_msg or "blocked" in error_msg:
                error_type = "banned"
                error_description = "Account is banned or blocked"
            elif "deleted" in error_msg or "removed" in error_msg:
                error_type = "deleted"
                error_description = "Account has been deleted"
            elif "network" in error_msg or "connection" in error_msg:
                error_type = "network_error"
                error_description = "Network connection failed"
            elif "auth" in error_msg or "unauthorized" in error_msg:
                error_type = "unauthorized"
                error_description = "Session not authorized"
            else:
                error_type = "unknown_error"
                error_description = f"Unknown error: {str(e)}"
            
            results.append({
                "session": file.filename,
                "status": "error",
                "error_type": error_type,
                "error": error_description,
                "raw_error": str(e),
                "user_id": None
            })
            await log_to_websocket(f"❌ {file.filename}: {error_description}")
            
        finally:
            if 'client' in locals():
                await client.disconnect()
                # Clean up temp file if it exists
                try:
                    if hasattr(client, 'session') and hasattr(client.session, 'filename'):
                        import os
                        if os.path.exists(client.session.filename):
                            os.unlink(client.session.filename)
                            logger.info(f"Cleaned up temp file for {file.filename}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file for {file.filename}: {e}")
    
    return {
        "message": f"Updated bios for {len(results)} sessions",
        "results": results,
        "total_sessions": len(results)
    } 