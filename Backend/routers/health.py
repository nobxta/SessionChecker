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
async def health_check_sessions(files: List[UploadFile] = File(...)):
    """
    Check session health using @SpamBot
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
            
            # Try to connect and check with SpamBot
            await client.connect()
            
            # Add debugging
            logger.info(f"Connected to Telegram for {file.filename}")
            
            is_authorized = await client.is_user_authorized()
            logger.info(f"Authorization check for {file.filename}: {is_authorized}")
            
            if is_authorized:
                try:
                    # Send /start to @SpamBot
                    spam_bot = await client.get_entity("@SpamBot")
                    result = await client.send_message(spam_bot, "/start")
                    
                    # Wait for response
                    await asyncio.sleep(2)
                    
                    # Get recent messages from SpamBot
                    messages = await client.get_messages(spam_bot, limit=1)
                    
                    if messages:
                        latest_message = messages[0]
                        message_text = latest_message.text.lower()
                        
                        # Analyze SpamBot response
                        if "good" in message_text or "no limitations" in message_text:
                            status = "healthy"
                            details = "No limitations detected"
                        elif "limited" in message_text or "restricted" in message_text:
                            status = "limited"
                            details = "Account has limitations"
                        elif "banned" in message_text:
                            status = "banned"
                            details = "Account is banned"
                        else:
                            status = "unknown"
                            details = "Unable to determine status"
                    else:
                        status = "no_response"
                        details = "No response from SpamBot"
                        
                    results.append({
                        "session": file.filename,
                        "status": status,
                        "details": details,
                        "spam_bot_response": latest_message.text if messages else None
                    })
                    
                    await log_to_websocket(f"✅ {file.filename}: Health check completed - {status}")
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    # Determine specific error type for SpamBot
                    if "flood" in error_msg or "wait" in error_msg:
                        error_type = "flood_wait"
                        error_description = "Rate limited - too many requests to SpamBot"
                    elif "banned" in error_msg or "blocked" in error_msg:
                        error_type = "banned"
                        error_description = "Account is banned or blocked"
                    elif "deleted" in error_msg or "removed" in error_msg:
                        error_type = "deleted"
                        error_description = "Account has been deleted"
                    elif "network" in error_msg or "connection" in error_msg:
                        error_type = "network_error"
                        error_description = "Network connection failed"
                    else:
                        error_type = "spambot_error"
                        error_description = f"SpamBot error: {str(e)}"
                    
                    results.append({
                        "session": file.filename,
                        "status": "error",
                        "error_type": error_type,
                        "details": error_description,
                        "raw_error": str(e),
                        "spam_bot_response": None
                    })
                    await log_to_websocket(f"❌ {file.filename}: {error_description}")
            else:
                results.append({
                    "session": file.filename,
                    "status": "unauthorized",
                    "details": "Session not authorized",
                    "spam_bot_response": None
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
                "details": error_description,
                "raw_error": str(e),
                "spam_bot_response": None
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
        "message": f"Health checked {len(results)} sessions",
        "results": results,
        "total_sessions": len(results)
    } 