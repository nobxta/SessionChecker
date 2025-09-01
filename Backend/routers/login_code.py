from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict, Optional
import asyncio
import logging
import re
import tempfile
import os
from datetime import datetime, timedelta, timezone
from utils.session_utils import create_telegram_client
from io import BytesIO

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login-details")
async def get_login_details(session_file: UploadFile = File(...)):
    """
    Get login details from session file (name, user_id, phone)
    """
    try:
        # Validate file extension
        if not session_file.filename.endswith('.session'):
            raise HTTPException(status_code=400, detail="File must be a .session file")
        
        # Read session file content into memory
        session_content = await session_file.read()
        session_buffer = BytesIO(session_content)
        
        # Create Telegram client
        client = await create_telegram_client(session_buffer, session_file.filename)
        
        try:
            await client.connect()
            
            if not await client.is_user_authorized():
                raise HTTPException(status_code=401, detail="Session is not authorized")
            
            # Get account info
            me = await client.get_me()
            full_name = f"{me.first_name or ''} {me.last_name or ''}".strip()
            user_id = me.id
            phone = me.phone
            
            # Format phone number with + prefix if not present
            if phone and not phone.startswith('+'):
                phone = f"+{phone}"
            
            return {
                "name": full_name,
                "user_id": user_id,
                "mob": phone,
                "status": "Login details retrieved successfully"
            }
            
        finally:
            await client.disconnect()
            # Clean up temp file if it exists
            try:
                if hasattr(client, 'session') and hasattr(client.session, 'filename'):
                    if os.path.exists(client.session.filename):
                        os.unlink(client.session.filename)
                        logger.info(f"Cleaned up temp file for {session_file.filename}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file for {session_file.filename}: {e}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing session: {str(e)}")

@router.post("/login-code")
async def get_login_code(session_file: UploadFile = File(...)):
    """
    Wait for and extract Telegram login code from session file
    """
    try:
        # Validate file extension
        if not session_file.filename.endswith('.session'):
            raise HTTPException(status_code=400, detail="File must be a .session file")
        
        # Read session file content into memory
        session_content = await session_file.read()
        session_buffer = BytesIO(session_content)
        
        # Create Telegram client
        client = await create_telegram_client(session_buffer, session_file.filename)
        
        try:
            await client.connect()
            
            if not await client.is_user_authorized():
                raise HTTPException(status_code=401, detail="Session is not authorized")
            
            # Scan for login code from Telegram (777000)
            logger.info("Waiting for login code from Telegram...")
            login_code = await scan_for_login_code(client)
            
            if not login_code:
                raise HTTPException(status_code=404, detail="No login code found. Please try again or check if you initiated a login process.")
            
            return {
                "login_code": login_code,
                "status": "Login code retrieved successfully"
            }
            
        finally:
            await client.disconnect()
            # Clean up temp file if it exists
            try:
                if hasattr(client, 'session') and hasattr(client.session, 'filename'):
                    if os.path.exists(client.session.filename):
                        os.unlink(client.session.filename)
                        logger.info(f"Cleaned up temp file for {session_file.filename}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file for {session_file.filename}: {e}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing session: {str(e)}")

async def scan_for_login_code(client) -> Optional[str]:
    """
    Scan for login code from Telegram official account (777000)
    """
    telegram_official = 777000
    ten_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
    
    # First, check recent messages (last 50 messages within 10 minutes)
    try:
        logger.info("Checking recent messages for login code...")
        messages = await client.get_messages(telegram_official, limit=50)
        
        for message in messages:
            if message.date > ten_minutes_ago:
                code = extract_login_code(message.text)
                if code:
                    logger.info(f"Found recent login code: {code}")
                    return code
    except Exception as e:
        logger.error(f"Error fetching recent messages: {e}")
    
    # If no code found in recent messages, wait for new ones (up to 5 minutes)
    logger.info("No recent code found. Waiting for new login code...")
    start_time = datetime.now(timezone.utc)
    timeout = timedelta(seconds=300)  # Wait 5 minutes
    last_message_date = None
    
    while datetime.now(timezone.utc) - start_time < timeout:
        try:
            # Get the latest message
            messages = await client.get_messages(telegram_official, limit=1)
            
            if messages and len(messages) > 0:
                latest_message = messages[0]
                
                # Check if this is a new message
                if last_message_date is None or latest_message.date > last_message_date:
                    last_message_date = latest_message.date
                    
                    # Check if message is recent enough
                    if latest_message.date > ten_minutes_ago:
                        code = extract_login_code(latest_message.text)
                        if code:
                            logger.info(f"Found new login code: {code}")
                            return code
                        else:
                            logger.info(f"New message received but no code found: {latest_message.text[:50]}...")
            
            # Wait 3 seconds before checking again
            await asyncio.sleep(3)
            
        except Exception as e:
            logger.error(f"Error scanning for new messages: {e}")
            await asyncio.sleep(3)
    
    logger.info("Timeout reached while waiting for login code")
    return None

def extract_login_code(text: str) -> Optional[str]:
    """
    Extract 5-digit login code from Telegram message
    """
    if not text:
        return None
    
    # Look for login code pattern in the message
    # The code appears to be 5 digits like "37981"
    patterns = [
        r'login code:\s*(\d{5})',  # "Login code: 37981"
        r'code:\s*(\d{5})',       # "code: 37981"
        r'(\d{5})',               # Just the 5-digit code
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            code = match.group(1)
            # Verify it's exactly 5 digits
            if len(code) == 5 and code.isdigit():
                return code
    
    return None

@router.post("/scan")
async def scan_account_info(files: List[UploadFile] = File(...)):
    """
    Extract basic account information from session files (for backward compatibility)
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
            
            # Try to connect and get account info
            await client.connect()
            
            if await client.is_user_authorized():
                try:
                    me = await client.get_me()
                    
                    # Get account info
                    account_info = {
                        "session": file.filename,
                        "status": "success",
                        "user_id": me.id,
                        "first_name": me.first_name or "",
                        "last_name": me.last_name or "",
                        "username": me.username or "",
                        "phone": me.phone or "",
                        "is_bot": me.bot,
                        "is_verified": me.verified,
                        "is_premium": getattr(me, 'premium', False),
                        "is_scam": getattr(me, 'scam', False),
                        "is_fake": getattr(me, 'fake', False)
                    }
                    
                    results.append(account_info)
                    logger.info(f"✅ {file.filename}: Account info extracted - User ID: {me.id}")
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    # Determine specific error type
                    if "flood" in error_msg or "wait" in error_msg:
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
                    else:
                        error_type = "extraction_error"
                        error_description = f"Account info extraction failed: {str(e)}"
                    
                    results.append({
                        "session": file.filename,
                        "status": "error",
                        "error_type": error_type,
                        "error": error_description,
                        "raw_error": str(e),
                        "user_id": None
                    })
                    logger.error(f"❌ {file.filename}: {error_description}")
            else:
                results.append({
                    "session": file.filename,
                    "status": "unauthorized",
                    "error": "Session not authorized",
                    "user_id": None
                })
                logger.error(f"❌ {file.filename}: Unauthorized session")
                
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
            logger.error(f"❌ {file.filename}: {error_description}")
            
        finally:
            if 'client' in locals():
                await client.disconnect()
                # Clean up temp file if it exists
                try:
                    if hasattr(client, 'session') and hasattr(client.session, 'filename'):
                        if os.path.exists(client.session.filename):
                            os.unlink(client.session.filename)
                            logger.info(f"Cleaned up temp file for {file.filename}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file for {file.filename}: {e}")
    
    return {
        "message": f"Scanned {len(results)} sessions",
        "results": results,
        "total_sessions": len(results)
    } 