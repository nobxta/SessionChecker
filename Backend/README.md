# Telegram Session Manager - Backend

A FastAPI-based backend for managing Telegram session files with real-time WebSocket updates.

## Features

- **ZIP Preview**: Extract and preview session files from ZIP archives
- **Session Validation**: Check authentication status of session files
- **Health Checks**: Use @SpamBot to check account limitations
- **Mass Profile Updates**: Set names, bios, and profile pictures
- **Code Extraction**: Extract login and auth codes from message history
- **Real-time Updates**: WebSocket streaming for live progress updates
- **API Rotation**: Round-robin API credential management
- **Stateless Design**: Fully in-memory operations, no disk persistence

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Credentials

Create a `.env` file in the Backend directory:

```env
API_PAIRS_JSON=[
  {
    "api_id": 123456,
    "api_hash": "your_api_hash_here"
  },
  {
    "api_id": 789012,
    "api_hash": "another_api_hash_here"
  }
]
```

### 3. Run the Server

```bash
python main.py
```

Or using uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### ZIP Operations
- `POST /zip/preview` - Preview session files in ZIP

### Session Validation
- `POST /validate` - Validate session authentication

### Health Checks
- `POST /health` - Check account health with @SpamBot

### Profile Updates
- `POST /name/set` - Set display names
- `POST /bio/set` - Set profile bios
- `POST /pfp/set` - Set profile pictures

### Code Extraction
- `POST /login_code` - Extract login codes
- `POST /auth_code` - Extract auth codes

### WebSocket
- `WS /ws/stream` - Real-time progress streaming

## Architecture

```
Backend/
├── main.py              # FastAPI application
├── routers/             # API route handlers
│   ├── zip_handler.py   # ZIP operations
│   ├── validator.py     # Session validation
│   ├── health.py        # Health checks
│   ├── name.py          # Name updates
│   ├── bio.py           # Bio updates
│   ├── pfp.py           # Profile picture updates
│   ├── login_code.py    # Login code extraction
│   ├── auth_code.py     # Auth code extraction
│   └── stream.py        # WebSocket streaming
├── utils/               # Utility functions
│   ├── file_utils.py    # File operations
│   ├── session_utils.py # Telegram client management
│   └── logger.py        # WebSocket logging
├── api_pool.py          # API credential management
├── config.py            # Configuration settings
└── requirements.txt     # Dependencies
```

## WebSocket Events

The WebSocket stream sends JSON messages with the following structure:

```json
{
  "type": "log|progress",
  "level": "info|success|error",
  "message": "Log message",
  "timestamp": "2023-01-01T00:00:00",
  "task_id": "task_identifier"
}
```

## Error Handling

All endpoints include comprehensive error handling:
- Invalid session files
- Network connectivity issues
- API rate limiting
- Authentication failures
- WebSocket connection drops

## Security Notes

- All operations are stateless and in-memory
- No session files are persisted to disk
- API credentials are rotated automatically
- CORS is configured for frontend integration

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest
```

### Code Style

The project follows PEP 8 standards. Use a linter like `flake8` or `black` for code formatting.

## Deployment

The backend is designed to be deployed on serverless platforms like Vercel:

1. All operations are stateless
2. No file system dependencies
3. WebSocket support for real-time updates
4. Environment-based configuration

## License

This project is part of the Telegram Session Management SaaS. 