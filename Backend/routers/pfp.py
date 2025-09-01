from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List, Dict
import asyncio
import logging
from utils.session_utils import create_telegram_client
from utils.logger import log_to_websocket
from io import BytesIO
import io
import os
from telethon import functions

logger = logging.getLogger(__name__)
router = APIRouter()

def validate_image_format(image_data: bytes, filename: str) -> bool:
    """
    Simple image format validation without external dependencies
    """
    # Check file extension
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    file_ext = os.path.splitext(filename.lower())[1]
    
    if file_ext not in allowed_extensions:
        return False
    
    # Check file size (max 10MB)
    if len(image_data) > 10 * 1024 * 1024:
        return False
    
    # Basic magic number validation for common image formats
    if file_ext in {'.jpg', '.jpeg'}:
        # JPEG magic numbers: FF D8 FF
        if len(image_data) >= 3 and image_data[0:3] == b'\xff\xd8\xff':
            return True
    elif file_ext == '.png':
        # PNG magic numbers: 89 50 4E 47
        if len(image_data) >= 8 and image_data[0:8] == b'\x89PNG\r\n\x1a\n':
            return True
    elif file_ext == '.gif':
        # GIF magic numbers: 47 49 46 38 (GIF8)
        if len(image_data) >= 6 and image_data[0:6] in [b'GIF87a', b'GIF89a']:
            return True
    elif file_ext == '.bmp':
        # BMP magic numbers: 42 4D (BM)
        if len(image_data) >= 2 and image_data[0:2] == b'BM':
            return True
    elif file_ext == '.webp':
        # WebP magic numbers: 52 49 46 46 ... 57 45 42 50
        if len(image_data) >= 12 and image_data[0:4] == b'RIFF' and image_data[8:12] == b'WEBP':
            return True
    
    # If we can't validate the magic numbers, accept based on extension
    return True

def verify_jpg_format(image_data: bytes) -> bool:
    """
    Verify if the image data is actually a valid JPG file
    """
    # JPG magic numbers: FF D8 FF
    if len(image_data) < 3:
        return False
    
    # Check for JPG magic numbers
    if image_data[0:3] == b'\xff\xd8\xff':
        return True
    
    return False

@router.post("/update_profile_picture")
async def update_profile_picture(
    session_file: UploadFile = File(...),
    profile_picture: UploadFile = File(...)
):
    """
    Update profile picture for a Telegram session
    """
    try:
        # Validate session file
        if not session_file.filename.endswith('.session'):
            raise HTTPException(status_code=400, detail="Session file must have .session extension")
        
        # Validate profile picture
        if not profile_picture.filename:
            raise HTTPException(status_code=400, detail="Profile picture filename is required")
        
        # Read image data
        image_data = await profile_picture.read()
        
        # Validate image format and size
        if not validate_image_format(image_data, profile_picture.filename):
            raise HTTPException(
                status_code=400, 
                detail="Invalid image format or size. Supported: JPG, PNG, GIF, BMP, WebP, max 10MB"
            )
        
        # Additional validation for JPG files
        if profile_picture.filename.lower().endswith(('.jpg', '.jpeg')):
            if not verify_jpg_format(image_data):
                raise HTTPException(
                    status_code=400,
                    detail="The file appears to be corrupted or not a valid JPG image. Please try converting your image again."
                )
        
        # Create Telegram client
        session_content = await session_file.read()
        session_buffer = BytesIO(session_content)
        client = await create_telegram_client(session_buffer, session_file.filename)
        
        try:
            # Connect to Telegram
            await client.connect()
            
            # Check if authorized
            if not await client.is_user_authorized():
                raise HTTPException(status_code=401, detail="Session not authorized")
            
            # Update profile picture
            # Convert image data back to BytesIO for Telegram
            image_io = BytesIO(image_data)
            image_io.seek(0)
            
            # Upload profile picture using the correct Telethon method
            uploaded_file = await client.upload_file(image_io)
            result = await client(functions.photos.UploadProfilePhotoRequest(
                file=uploaded_file
            ))
            
            await client.disconnect()
            
            return {
                "status": "success",
                "message": "Profile picture updated successfully",
                "photo_id": str(result.id) if result else None
            }
            
        except Exception as e:
            await client.disconnect()
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile picture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile picture: {str(e)}")

@router.post("/update_multiple_profile_pictures")
async def update_multiple_profile_pictures(
    profile_picture: UploadFile = File(...),
    session_files: List[UploadFile] = File(...)
):
    """
    Update profile picture for multiple Telegram sessions
    """
    results = []
    
    # Validate profile picture first
    if not profile_picture.filename:
        raise HTTPException(status_code=400, detail="Profile picture filename is required")
    
    # Read image data once
    image_data = await profile_picture.read()
    
    # Validate image format and size
    if not validate_image_format(image_data, profile_picture.filename):
        raise HTTPException(
            status_code=400, 
            detail="Invalid image format or size. Supported: JPG, PNG, GIF, BMP, WebP, max 10MB"
        )
    
    # Additional validation for JPG files
    if profile_picture.filename.lower().endswith(('.jpg', '.jpeg')):
        if not verify_jpg_format(image_data):
            raise HTTPException(
                status_code=400,
                detail="The file appears to be corrupted or not a valid JPG image. Please try converting your image again."
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
                
                # Update profile picture
                # Convert image data back to BytesIO for Telegram
                image_io = BytesIO(image_data)
                image_io.seek(0)
                
                # Upload profile picture using the correct Telethon method
                uploaded_file = await client.upload_file(image_io)
                result = await client(functions.photos.UploadProfilePhotoRequest(
                    file=uploaded_file
                ))
                
                await client.disconnect()
                
                results.append({
                    "session": session_file.filename,
                    "status": "success",
                    "message": "Profile picture updated successfully",
                    "photo_id": str(result.id) if result else None
                })
                
            except Exception as e:
                await client.disconnect()
                results.append({
                    "session": session_file.filename,
                    "status": "error",
                    "error": str(e),
                    "error_type": "photo_error"
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
    successful_updates = len([r for r in results if r["status"] == "success"])
    errors = len([r for r in results if r["status"] == "error"])
    unauthorized = len([r for r in results if r.get("error_type") == "unauthorized"])
    
    return {
        "results": results,
        "summary": {
            "total_sessions": total_sessions,
            "successfully_updated": successful_updates,
            "errors": errors,
            "unauthorized": unauthorized
        }
    }