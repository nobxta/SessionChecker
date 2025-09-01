from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict
import asyncio
import logging
from utils.session_utils import create_telegram_client
from utils.logger import log_to_websocket
from io import BytesIO

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/")
async def validate_sessions(files: List[UploadFile] = File(...)):
    """
    Validate multiple session files by checking authentication
    """
    results = []
    
    for file in files:
        if not file.filename.endswith('.session'):
            continue
            
        try:
            session_content = await file.read()
            session_buffer = BytesIO(session_content)
            
            # Debug session content
            logger.info(f"Session file {file.filename}: {len(session_content)} bytes")
            try:
                session_string = session_content.decode('utf-8', errors='ignore').strip()
                logger.info(f"Session string preview: {session_string[:50]}...")
                logger.info(f"Is string session: {session_string.startswith('1:')}")
            except:
                logger.info("Session is binary format")
            
            # Show first 20 bytes as hex for debugging
            hex_preview = session_content[:20].hex()
            logger.info(f"Session file hex preview: {hex_preview}")
            
            # Create Telegram client
            client = await create_telegram_client(session_buffer, file.filename)
            
            # Try to connect and get user info
            await client.connect()
            
            # Add debugging
            logger.info(f"Connected to Telegram for {file.filename}")
            
            is_authorized = await client.is_user_authorized()
            logger.info(f"Authorization check for {file.filename}: {is_authorized}")
            
            if is_authorized:
                me = await client.get_me()
                results.append({
                    "session": file.filename,
                    "status": "success",
                    "user_id": me.id,
                    "phone": me.phone,
                    "username": me.username,
                    "first_name": me.first_name,
                    "last_name": me.last_name
                })
                await log_to_websocket(f"✅ {file.filename}: Valid session for user {me.id}")
            else:
                results.append({
                    "session": file.filename,
                    "status": "unauthorized",
                    "user_id": None,
                    "phone": None,
                    "username": None,
                    "first_name": None,
                    "last_name": None
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
                "user_id": None,
                "phone": None,
                "username": None,
                "first_name": None,
                "last_name": None
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
        "message": f"Validated {len(results)} sessions",
        "results": results,
        "total_sessions": len(results)
    } 