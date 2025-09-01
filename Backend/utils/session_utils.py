import asyncio
import logging
import random
import json
import os
from io import BytesIO
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.sessions import StringSession
from api_pool import get_api_credentials

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self):
        self.api_credentials = get_api_credentials()
        self.current_api_index = 0
        
    def get_next_api_credentials(self) -> Dict[str, Any]:
        """
        Get next API credentials using round-robin
        """
        if not self.api_credentials:
            raise ValueError("No API credentials available")
            
        credentials = self.api_credentials[self.current_api_index]
        self.current_api_index = (self.current_api_index + 1) % len(self.api_credentials)
        
        return credentials
    
    def get_random_api_credentials(self) -> Dict[str, Any]:
        """
        Get random API credentials
        """
        if not self.api_credentials:
            raise ValueError("No API credentials available")
            
        return random.choice(self.api_credentials)

# Global session manager
session_manager = SessionManager()

async def create_telegram_client(session_buffer: BytesIO, session_name: str) -> TelegramClient:
    """
    Create a Telegram client from session buffer
    """
    try:
        # Get API credentials
        credentials = session_manager.get_next_api_credentials()
        
        # Create a temporary file to load the binary session
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix='.session', delete=False) as temp_file:
            # Write the binary session data to temp file
            session_buffer.seek(0)
            temp_file.write(session_buffer.read())
            temp_file.flush()
            
            # Create client with the binary session file
            client = TelegramClient(
                temp_file.name,  # Use the temp file path directly
                credentials['api_id'],
                credentials['api_hash'],
                device_model="Session Manager",
                system_version="1.0",
                app_version="1.0",
                lang_code="en"
            )
            
            logger.info(f"Created Telegram client for session: {session_name} using temp file: {temp_file.name}")
            return client
        
    except Exception as e:
        logger.error(f"Error creating Telegram client for {session_name}: {e}")
        raise

async def validate_session(client: TelegramClient) -> Dict[str, Any]:
    """
    Validate a session and return user info
    """
    try:
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            return {
                "valid": True,
                "user_id": me.id,
                "phone": me.phone,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name
            }
        else:
            return {
                "valid": False,
                "error": "Session not authorized"
            }
            
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }
    finally:
        await client.disconnect()

async def send_message_safely(client: TelegramClient, entity, message: str) -> bool:
    """
    Safely send a message with error handling
    """
    try:
        await client.send_message(entity, message)
        return True
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        return False

async def get_messages_safely(client: TelegramClient, entity, limit: int = 50):
    """
    Safely get messages with error handling
    """
    try:
        return await client.get_messages(entity, limit=limit)
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        return []

def format_user_info(user_info: Dict[str, Any]) -> str:
    """
    Format user info for logging
    """
    if user_info.get("valid"):
        return f"User {user_info['user_id']} ({user_info.get('username', 'no username')})"
    else:
        return f"Invalid session: {user_info.get('error', 'unknown error')}" 