"""
Centralized error handler for Telethon and Telegram API errors
Maps technical errors to human-readable messages
"""

from telethon.errors import RPCError
from typing import Dict, Any

# Comprehensive error mapping for all known Telethon errors
ERROR_MAP = {
    # Authentication & Session Errors
    "AuthKeyInvalidError": "Invalid session. Please re-login to your account.",
    "AuthKeyNotFound": "Session not found. Please re-login to your account.",
    "AuthKeyUnregisteredError": "Session not registered. Please re-login to your account.",
    "SessionExpiredError": "Your session has expired. Please re-login to your account.",
    "SessionPasswordNeededError": "Two-factor authentication required. Please enter your 2FA password.",
    "SessionRevokedError": "Your session has been revoked. Please re-login to your account.",
    "SessionTooFreshError": "Session is too new. Please wait a moment before trying again.",
    
    # Rate Limiting & Flood Protection
    "FloodWaitError": "Too many requests. Please wait before retrying this action.",
    "FloodError": "Too many requests. Please wait before retrying this action.",
    "PeerFloodError": "Action blocked due to spam protection. Please wait before trying again.",
    "PhoneNumberFloodError": "Too many attempts with this phone number. Please wait before trying again.",
    "PhonePasswordFloodError": "Too many password attempts. Please wait before trying again.",
    
    # Account Status Errors
    "UserDeactivatedError": "This account has been deactivated by Telegram.",
    "UserDeletedError": "This account has been deleted.",
    "UserBannedInChannelError": "This user is banned in the channel.",
    "UserBlockedError": "This user has blocked you.",
    "UserKickedError": "You have been kicked from this chat.",
    "UserRestrictedError": "Your account has restrictions. Please contact Telegram support.",
    "PhoneNumberBannedError": "This phone number is banned by Telegram.",
    "PhoneNumberInvalidError": "Invalid phone number format.",
    "PhoneNumberOccupiedError": "This phone number is already in use.",
    "PhoneNumberUnoccupiedError": "This phone number is not registered.",
    
    # Permission & Access Errors
    "ChatAdminRequiredError": "Admin privileges required for this action.",
    "ChatForbiddenError": "You don't have permission to access this chat.",
    "ChatSendMediaForbiddenError": "Sending media is not allowed in this chat.",
    "ChatSendGifsForbiddenError": "Sending GIFs is not allowed in this chat.",
    "ChatSendStickersForbiddenError": "Sending stickers is not allowed in this chat.",
    "ChatSendPollForbiddenError": "Sending polls is not allowed in this chat.",
    "ChatWriteForbiddenError": "You cannot send messages to this chat.",
    "ChatRestrictedError": "This chat has restrictions that prevent this action.",
    
    # File & Media Errors
    "FilePartTooBigError": "File is too large. Please use a smaller file.",
    "FilePartSizeInvalidError": "Invalid file size. Please check your file.",
    "FilePartMissingError": "File upload incomplete. Please try again.",
    "PhotoInvalidDimensionsError": "Invalid image dimensions. Please use a different image.",
    "PhotoCropSizeSmallError": "Image crop size is too small. Please use a larger image.",
    "MediaCaptionTooLongError": "Media caption is too long. Please shorten it.",
    
    # Network & Connection Errors
    "NetworkMigrateError": "Network connection issue. Please try again.",
    "TimedOutError": "Request timed out. Please check your connection and try again.",
    "TimeoutError": "Request timed out. Please check your connection and try again.",
    "ConnectionNotInitedError": "Connection not initialized. Please try again.",
    
    # API & Method Errors
    "MethodInvalidError": "Invalid method call. Please try again.",
    "ApiIdInvalidError": "Invalid API credentials. Please check your configuration.",
    "BotMethodInvalidError": "Bot method not allowed. Please check your bot permissions.",
    "BotCommandInvalidError": "Invalid bot command. Please check the command format.",
    
    # Content & Format Errors
    "MessageTooLongError": "Message is too long. Please shorten your message.",
    "AboutTooLongError": "Bio text is too long. Please shorten it.",
    "FirstNameInvalidError": "Invalid first name. Please use valid characters.",
    "LastNameInvalidError": "Invalid last name. Please use valid characters.",
    "UsernameInvalidError": "Invalid username format. Please use only letters, numbers, and underscores.",
    "UsernameOccupiedError": "Username is already taken. Please choose a different one.",
    "TitleInvalidError": "Invalid title. Please use valid characters.",
    
    # Group & Channel Errors
    "ChannelTooBigError": "Channel is too large for this action.",
    "ChannelPrivateError": "This channel is private. You need an invite to access it.",
    "ChannelBannedError": "This channel has banned you.",
    "MegagroupRequiredError": "This action requires a supergroup.",
    "ChatTooBigError": "Chat is too large for this action.",
    
    # General Errors
    "BadRequestError": "Invalid request. Please check your input and try again.",
    "NotFoundError": "Requested item not found. Please check your input.",
    "ForbiddenError": "Action not allowed. You don't have permission for this.",
    "UnauthorizedError": "Authentication required. Please log in again.",
    "ServerError": "Telegram server error. Please try again later.",
    "SecurityError": "Security check failed. Please try again.",
    
    # Special Cases
    "RPCError": "Telegram API error. Please try again later.",
    "MultiError": "Multiple errors occurred. Please try again.",
    "InvalidBufferError": "Invalid data received. Please try again.",
    "InvalidChecksumError": "Data corruption detected. Please try again.",
    "InvalidDCError": "Invalid data center. Please try again.",
}

def format_error(err: Exception) -> str:
    """
    Format technical errors into human-readable messages
    
    Args:
        err: The exception that occurred
        
    Returns:
        Human-readable error message
    """
    if not err:
        return "An unexpected error occurred"
    
    # Get the error class name
    err_name = err.__class__.__name__
    
    # Check if we have a mapping for this error
    if err_name in ERROR_MAP:
        return ERROR_MAP[err_name]
    
    # Handle RPCError with specific error messages
    if isinstance(err, RPCError):
        error_message = str(err)
        
        # Check for common RPC error patterns
        if "FLOOD_WAIT" in error_message:
            return "Too many requests. Please wait before trying again."
        elif "USER_DEACTIVATED" in error_message:
            return "This account has been deactivated by Telegram."
        elif "USER_DELETED" in error_message:
            return "This account has been deleted."
        elif "PHONE_NUMBER_BANNED" in error_message:
            return "This phone number is banned by Telegram."
        elif "AUTH_KEY_INVALID" in error_message:
            return "Invalid session. Please re-login to your account."
        elif "SESSION_REVOKED" in error_message:
            return "Your session has been revoked. Please re-login to your account."
        elif "FLOOD_WAIT" in error_message:
            return "Too many requests. Please wait before trying again."
        else:
            # Return a generic but helpful message
            return f"Telegram error: {error_message}"
    
    # For unknown errors, provide a generic message
    return f"An unexpected error occurred: {err_name}. Please try again or contact support."

def get_error_type(err: Exception) -> str:
    """
    Get the error type for frontend categorization
    
    Args:
        err: The exception that occurred
        
    Returns:
        Error type string for frontend handling
    """
    if not err:
        return "unknown_error"
    
    err_name = err.__class__.__name__
    
    # Categorize errors for frontend
    if "Flood" in err_name or "Wait" in err_name:
        return "rate_limit"
    elif "Auth" in err_name or "Session" in err_name:
        return "authentication"
    elif "User" in err_name and ("Deactivated" in err_name or "Deleted" in err_name):
        return "account_status"
    elif "Phone" in err_name and "Banned" in err_name:
        return "account_banned"
    elif "Permission" in err_name or "Admin" in err_name or "Forbidden" in err_name:
        return "permission"
    elif "Network" in err_name or "Timeout" in err_name or "Connection" in err_name:
        return "network"
    elif "File" in err_name or "Media" in err_name or "Photo" in err_name:
        return "file_upload"
    elif "Content" in err_name or "Format" in err_name or "Invalid" in err_name:
        return "validation"
    else:
        return "general_error"

def format_error_response(err: Exception) -> Dict[str, Any]:
    """
    Format error for API response
    
    Args:
        err: The exception that occurred
        
    Returns:
        Formatted error response dictionary
    """
    return {
        "detail": format_error(err),
        "error_type": get_error_type(err),
        "technical_error": str(err),
        "error_class": err.__class__.__name__
    }
