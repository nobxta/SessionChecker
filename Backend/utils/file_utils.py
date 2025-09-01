import zipfile
from io import BytesIO
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

def extract_session_files_from_zip(zip_content: bytes) -> List[Dict]:
    """
    Extract session files from ZIP content in memory
    """
    session_files = []
    
    try:
        zip_buffer = BytesIO(zip_content)
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            for file_info in zip_file.filelist:
                filename = file_info.filename
                if filename.endswith('.session'):
                    # Read the session file content
                    session_content = zip_file.read(filename)
                    
                    session_files.append({
                        "filename": filename,
                        "size": file_info.file_size,
                        "content": session_content
                    })
        
        logger.info(f"Extracted {len(session_files)} session files from ZIP")
        return session_files
        
    except zipfile.BadZipFile as e:
        logger.error(f"Invalid ZIP file: {e}")
        raise ValueError("Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error extracting ZIP: {e}")
        raise

def validate_session_file(content: bytes, filename: str) -> bool:
    """
    Basic validation of session file content
    """
    try:
        # Check if it's a valid session file (basic check)
        if len(content) < 100:  # Session files are typically larger
            return False
            
        # Check for common session file patterns
        content_str = content.decode('utf-8', errors='ignore')
        if 'session' in content_str.lower() or 'telegram' in content_str.lower():
            return True
            
        return True  # Assume valid if basic checks pass
        
    except Exception as e:
        logger.error(f"Error validating session file {filename}: {e}")
        return False

def get_session_name_from_filename(filename: str) -> str:
    """
    Extract session name from filename
    """
    if filename.endswith('.session'):
        return filename[:-8]  # Remove .session extension
    return filename 