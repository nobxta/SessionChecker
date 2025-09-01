import os
import json
import logging
from typing import List, Dict, Any
from config import DEFAULT_API_PAIRS

logger = logging.getLogger(__name__)

def get_api_credentials() -> List[Dict[str, Any]]:
    """
    Load API credentials from environment variable or use defaults
    """
    try:
        api_pairs_json = os.getenv('API_PAIRS_JSON')
        
        if not api_pairs_json:
            logger.warning("API_PAIRS_JSON environment variable not set")
            # Use default credentials from config
            logger.info(f"Using {len(DEFAULT_API_PAIRS)} default API credentials")
            return DEFAULT_API_PAIRS
        
        # Parse JSON string
        api_pairs = json.loads(api_pairs_json)
        
        # Validate structure
        if not isinstance(api_pairs, list):
            logger.error("API_PAIRS_JSON must be a JSON array")
            # Fall back to defaults
            logger.info(f"Using {len(DEFAULT_API_PAIRS)} default API credentials")
            return DEFAULT_API_PAIRS
        
        # Validate each pair
        valid_pairs = []
        for i, pair in enumerate(api_pairs):
            if isinstance(pair, dict) and 'api_id' in pair and 'api_hash' in pair:
                valid_pairs.append({
                    'api_id': int(pair['api_id']),
                    'api_hash': str(pair['api_hash'])
                })
            else:
                logger.warning(f"Invalid API pair at index {i}: {pair}")
        
        if not valid_pairs:
            logger.warning("No valid API credentials found in environment variable")
            # Fall back to defaults
            logger.info(f"Using {len(DEFAULT_API_PAIRS)} default API credentials")
            return DEFAULT_API_PAIRS
        
        logger.info(f"Loaded {len(valid_pairs)} valid API credentials from environment")
        return valid_pairs
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in API_PAIRS_JSON: {e}")
        # Fall back to defaults
        logger.info(f"Using {len(DEFAULT_API_PAIRS)} default API credentials")
        return DEFAULT_API_PAIRS
    except Exception as e:
        logger.error(f"Error loading API credentials: {e}")
        # Fall back to defaults
        logger.info(f"Using {len(DEFAULT_API_PAIRS)} default API credentials")
        return DEFAULT_API_PAIRS

def validate_api_credentials(api_id: int, api_hash: str) -> bool:
    """
    Basic validation of API credentials
    """
    try:
        # Check if api_id is a positive integer
        if not isinstance(api_id, int) or api_id <= 0:
            return False
        
        # Check if api_hash is a non-empty string
        if not isinstance(api_hash, str) or len(api_hash) < 10:
            return False
        
        return True
        
    except Exception:
        return False

def get_credentials_count() -> int:
    """
    Get the number of available API credentials
    """
    return len(get_api_credentials())

def get_credentials_info() -> Dict[str, Any]:
    """
    Get information about available credentials
    """
    credentials = get_api_credentials()
    return {
        "count": len(credentials),
        "available": len(credentials) > 0,
        "api_ids": [cred['api_id'] for cred in credentials] if credentials else []
    } 