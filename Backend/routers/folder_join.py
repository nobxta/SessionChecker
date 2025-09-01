from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List, Dict
import asyncio
import logging
import re
from utils.session_utils import create_telegram_client
from utils.logger import log_to_websocket
from io import BytesIO
from telethon import functions
from telethon.errors import SessionPasswordNeededError, FloodWaitError

logger = logging.getLogger(__name__)
router = APIRouter()

def extract_slug_from_link(folder_link: str) -> str:
    """
    Extract slug from folder link like https://t.me/addlist/abc123
    """
    # Pattern to match t.me/addlist/slug
    pattern = r't\.me/addlist/([a-zA-Z0-9_-]+)'
    match = re.search(pattern, folder_link)
    
    if match:
        return match.group(1)
    
    # If no match, assume the input is already a slug
    return folder_link.strip()

@router.post("/join_folder")
async def join_folder(
    folder_link: str = Form(...),
    session_files: List[UploadFile] = File(...)
):
    """
    Join a folder/chatlist with multiple Telegram sessions
    """
    results = []
    
    # Extract slug from folder link
    try:
        slug = extract_slug_from_link(folder_link)
        logger.info(f"Extracted slug: {slug} from link: {folder_link}")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder link format. Expected: https://t.me/addlist/slug or just slug"
        )
    
    # Process each session file
    for session_file in session_files:
        try:
            # Validate session file
            if not session_file.filename.endswith('.session'):
                results.append({
                    "session": session_file.filename,
                    "status": "error",
                    "error": "Session file must have .session extension",
                    "error_type": "invalid_session"
                })
                continue
            
            # Read session content once
            session_content = await session_file.read()
            session_buffer = BytesIO(session_content)
            
            # Create Telegram client
            client = await create_telegram_client(session_buffer, session_file.filename)
            
            try:
                # Connect to Telegram
                await client.connect()
                
                # Check if authorized
                if not await client.is_user_authorized():
                    results.append({
                        "session": session_file.filename,
                        "status": "error",
                        "error": "Session not authorized",
                        "error_type": "unauthorized"
                    })
                    await client.disconnect()
                    continue
                
                # Check the chatlist invite
                logger.info(f"Checking chatlist invite for {session_file.filename}")
                chatlist_invite = await client(functions.chatlists.CheckChatlistInviteRequest(slug=slug))
                
                # Check if user is already in this chatlist by looking at the response
                # If the response doesn't have 'peers', it usually means the user is already in the folder
                if not hasattr(chatlist_invite, 'peers') or not chatlist_invite.peers:
                    logger.info(f"Session {session_file.filename} appears to already be in folder: {slug}")
                    results.append({
                        "session": session_file.filename,
                        "status": "info",
                        "message": f"Session already has this folder: {slug}",
                        "folder_slug": slug,
                        "already_in_folder": True
                    })
                    await client.disconnect()
                    continue
                
                # Join the chatlist using .peers directly
                try:
                    await client(functions.chatlists.JoinChatlistInviteRequest(
                        slug=slug,
                        peers=chatlist_invite.peers
                    ))
                    
                    logger.info(f"Successfully joined folder for {session_file.filename}")
                    results.append({
                        "session": session_file.filename,
                        "status": "success",
                        "message": f"Successfully joined folder: {slug}",
                        "folder_slug": slug,
                        "already_in_folder": False
                    })
                    
                except Exception as e:
                    logger.error(f"Error joining folder for {session_file.filename}: {e}")
                    # Check if the error indicates the user is already in the folder
                    error_msg = str(e).lower()
                    if "already" in error_msg or "invite" in error_msg:
                        results.append({
                            "session": session_file.filename,
                            "status": "info",
                            "message": f"Session already has this folder: {slug}",
                            "folder_slug": slug,
                            "already_in_folder": True
                        })
                    else:
                        results.append({
                            "session": session_file.filename,
                            "status": "error",
                            "error": str(e),
                            "error_type": "folder_error"
                        })
                
                await client.disconnect()
                
            except FloodWaitError as e:
                await client.disconnect()
                results.append({
                    "session": session_file.filename,
                    "status": "error",
                    "error": f"Flood wait: wait {e.seconds} seconds",
                    "error_type": "flood_wait",
                    "wait_seconds": e.seconds
                })
                
            except SessionPasswordNeededError:
                await client.disconnect()
                results.append({
                    "session": session_file.filename,
                    "status": "error",
                    "error": "2FA enabled for this session. Enter password manually.",
                    "error_type": "twofa_required"
                })
                
            except Exception as e:
                await client.disconnect()
                results.append({
                    "session": session_file.filename,
                    "status": "error",
                    "error": str(e),
                    "error_type": "general_error"
                })
                
        except Exception as e:
            results.append({
                "session": session_file.filename,
                "status": "error",
                "error": str(e),
                "error_type": "general_error"
            })
    
    # Calculate summary
    total_sessions = len(session_files)
    successful_joins = len([r for r in results if r["status"] == "success"])
    already_in_folder = len([r for r in results if r.get("already_in_folder") == True])
    errors = len([r for r in results if r["status"] == "error"])
    unauthorized = len([r for r in results if r.get("error_type") == "unauthorized"])
    flood_wait = len([r for r in results if r.get("error_type") == "flood_wait"])
    twofa_required = len([r for r in results if r.get("error_type") == "twofa_required"])
    
    return {
        "results": results,
        "summary": {
            "total_sessions": total_sessions,
            "successfully_joined": successful_joins,
            "already_in_folder": already_in_folder,
            "errors": errors,
            "unauthorized": unauthorized,
            "flood_wait": flood_wait,
            "twofa_required": twofa_required
        },
        "folder_info": {
            "slug": slug,
            "link": folder_link
        }
    }
