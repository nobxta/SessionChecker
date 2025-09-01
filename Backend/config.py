import os
from typing import List, Dict, Any

# Server Configuration
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8000))
DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# API Credentials Template
# Replace these with your actual Telegram API credentials
DEFAULT_API_PAIRS = [
    {
        "api_id": 15574422,
        "api_hash": "b83bed77ffd97bb61f6e51dddced1e8f"
    },
    {
        "api_id": 27276388,
        "api_hash": "c2ea15bdbf0ea0b770ecf5f66b4e35c3"
    }
]

def get_api_pairs() -> List[Dict[str, Any]]:
    """
    Get API pairs from environment or return defaults
    """
    api_pairs_json = os.getenv('API_PAIRS_JSON')
    
    if api_pairs_json:
        try:
            import json
            return json.loads(api_pairs_json)
        except:
            pass
    
    return DEFAULT_API_PAIRS 