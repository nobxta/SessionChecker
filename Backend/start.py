#!/usr/bin/env python3
"""
Startup script for Telegram Session Manager Backend
"""

import os
import sys
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'telethon',
        'multipart'  # Changed from python-multipart to multipart
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing packages: {missing_packages}")
        logger.error("Please install missing packages with: pip install -r requirements.txt")
        return False
    
    logger.info("✅ All dependencies are installed")
    return True

def check_configuration():
    """Check if the configuration is valid"""
    try:
        from api_pool import get_api_credentials
        
        credentials = get_api_credentials()
        if not credentials:
            logger.error("❌ No API credentials found")
            logger.error("Please set the API_PAIRS_JSON environment variable")
            logger.error("Example: API_PAIRS_JSON='[{\"api_id\": 123456, \"api_hash\": \"your_hash\"}]'")
            return False
        
        logger.info(f"✅ Found {len(credentials)} API credentials")
        return True
        
    except Exception as e:
        logger.error(f"❌ Configuration error: {e}")
        return False

def start_server():
    """Start the FastAPI server"""
    try:
        import uvicorn
        from main import app
        from config import HOST, PORT, DEBUG
        
        logger.info(f"Starting server on {HOST}:{PORT}")
        logger.info(f"Debug mode: {DEBUG}")
        
        uvicorn.run(
            "main:app",
            host=HOST,
            port=PORT,
            reload=DEBUG,
            log_level="info"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("=" * 60)
    print("Telegram Session Manager Backend")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check configuration
    if not check_configuration():
        sys.exit(1)
    
    print("\n🚀 Starting server...")
    print("=" * 60)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main() 