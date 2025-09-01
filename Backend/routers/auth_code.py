from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict, Optional
import asyncio
import logging
import re
import tempfile
import os
from datetime import datetime, timedelta, timezone
from utils.session_utils import create_telegram_client
from utils.error_handler import format_error_response
from utils.logger import log_to_websocket
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
        error_response = format_error_response(e)
        raise HTTPException(status_code=500, detail=error_response["detail"])

@router.post("/auth-code")
async def get_auth_code(session_file: UploadFile = File(...)):
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
        error_response = format_error_response(e)
        raise HTTPException(status_code=500, detail=error_response["detail"])

async def scan_for_login_code(client) -> Optional[str]:
    """
    Scan for login code from Telegram official account (777000) with real-time webhook-like behavior
    """
    telegram_official = 777000
    one_minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
    
    # First, check for any recent codes from the last minute
    try:
        logger.info("Checking for recent login codes from the last minute...")
        messages = await client.get_messages(telegram_official, limit=10)
        
        for message in messages:
            if message.date > one_minute_ago:
                logger.info(f"Checking recent message: {message.text[:100]}...")
                code = extract_login_code(message.text)
                if code:
                    logger.info(f"Found recent login code from last minute: {code}")
                    return code
    except Exception as e:
        logger.error(f"Error fetching recent messages: {e}")
    
    # If no recent code found, wait for new incoming messages in real-time
    logger.info("No recent code found. Waiting for new incoming login code in real-time...")
    start_time = datetime.now(timezone.utc)
    timeout = timedelta(seconds=300)  # Wait 5 minutes max
    last_message_date = None
    
    while datetime.now(timezone.utc) - start_time < timeout:
        try:
            # Get only the latest message to check for new ones
            messages = await client.get_messages(telegram_official, limit=1)
            
            if messages and len(messages) > 0:
                latest_message = messages[0]
                
                # Check if this is a new message we haven't seen before
                if last_message_date is None or latest_message.date > last_message_date:
                    last_message_date = latest_message.date
                    
                    # Check if message is very recent (within last 30 seconds for real-time feel)
                    thirty_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=30)
                    if latest_message.date > thirty_seconds_ago:
                        logger.info(f"🔔 NEW MESSAGE RECEIVED: {latest_message.text[:100]}...")
                        code = extract_login_code(latest_message.text)
                        if code:
                            logger.info(f"✅ LOGIN CODE FOUND: {code}")
                            return code
                        else:
                            logger.info(f"📝 New message received but no login code found")
                    else:
                        logger.info(f"⏰ Message is older than 30 seconds, continuing to wait...")
            
            # Wait only 1 second for more responsive real-time behavior
            await asyncio.sleep(1)
            
        except Exception as e:
            logger.error(f"Error scanning for new messages: {e}")
            await asyncio.sleep(2)  # Slightly longer wait on error
    
    logger.info("⏰ Timeout reached while waiting for login code")
    return None

def extract_login_code(text: str) -> Optional[str]:
    """
    Extract Telegram login code from message text
    """
    if not text:
        return None
    
    logger.info(f"Extracting login code from text: {text}")
    
    # Split text into lines to find the code
    lines = text.split('\n')
    
    # Look for the line that contains "This is your login code:" and get the next line
    for i, line in enumerate(lines):
        if "This is your login code:" in line:
            # The code should be on the next line
            if i + 1 < len(lines):
                code_line = lines[i + 1].strip()
                # Remove backticks if present and check if it's alphanumeric
                if code_line.startswith('`') and code_line.endswith('`'):
                    code_line = code_line[1:-1]  # Remove backticks
                
                # Check if the next line contains only alphanumeric characters (the code)
                if code_line and code_line.isalnum() and 8 <= len(code_line) <= 20:
                    logger.info(f"Found login code on next line: {code_line}")
                    return code_line
    
    # Alternative: Look for the pattern "This is your login code: CODE"
    patterns = [
        r'This is your login code:\s*([A-Za-z0-9]{8,})',  # "This is your login code: vmd4cW99RbM"
        r'login code:\s*([A-Za-z0-9]{8,})',              # "login code: vmd4cW99RbM"
        r'code:\s*([A-Za-z0-9]{8,})',                     # "code: vmd4cW99RbM"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            code = match.group(1)
            # Verify it's a reasonable length for a login code (8-20 characters)
            if 8 <= len(code) <= 20 and code.isalnum():
                logger.info(f"Extracted login code via regex: {code}")
                return code
    
    # If still no match, look for lines that contain only alphanumeric characters
    for line in lines:
        line = line.strip()
        # Remove backticks if present
        if line.startswith('`') and line.endswith('`'):
            line = line[1:-1]
        
        # Look for lines that contain only alphanumeric characters and are 8-20 chars long
        if line and line.isalnum() and 8 <= len(line) <= 20:
            # Additional check: make sure it's not just a common word
            common_words = ['telegram', 'account', 'login', 'code', 'dear', 'nobi', 'received', 'request', 'delete', 'never', 'ignore', '2023']
            if line.lower() not in common_words:
                logger.info(f"Found potential login code in line: {line}")
                return line
    
    logger.info(f"No login code found in text")
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
                    error_response = format_error_response(e)
                    results.append({
                        "session": file.filename,
                        "status": "error",
                        "error_type": error_response["error_type"],
                        "error": error_response["detail"],
                        "raw_error": error_response["technical_error"],
                        "user_id": None
                    })
                    logger.error(f"❌ {file.filename}: {error_response['detail']}")
            else:
                results.append({
                    "session": file.filename,
                    "status": "unauthorized",
                    "error": "Session not authorized",
                    "user_id": None
                })
                logger.error(f"❌ {file.filename}: Unauthorized session")
                
        except Exception as e:
            error_response = format_error_response(e)
            results.append({
                "session": file.filename,
                "status": "error",
                "error_type": error_response["error_type"],
                "error": error_response["detail"],
                "raw_error": error_response["technical_error"],
                "user_id": None
            })
            logger.error(f"❌ {file.filename}: {error_response['detail']}")
            
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