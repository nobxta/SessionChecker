from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
import zipfile
from io import BytesIO
import logging
import tempfile
import os
import json
import base64

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/preview")
async def preview_zip(file: UploadFile = File(...)):
    """
    Extract session file names from uploaded ZIP file
    """
    try:
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP file")
        
        # Read ZIP file into memory
        zip_content = await file.read()
        zip_buffer = BytesIO(zip_content)
        
        session_files = []
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            for file_info in zip_file.filelist:
                filename = file_info.filename
                if filename.endswith('.session'):
                    session_files.append({
                        "filename": filename,
                        "size": file_info.file_size
                    })
        
        if not session_files:
            raise HTTPException(status_code=400, detail="No .session files found in ZIP")
        
        return {
            "message": f"Found {len(session_files)} session files",
            "session_files": session_files,
            "total_files": len(session_files)
        }
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error processing ZIP file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing ZIP file")

@router.post("/extract")
async def extract_session_files(
    file: UploadFile = File(...),
    filenames: Optional[str] = Form(None)
):
    """
    Extract specific session files from ZIP and return them as individual files
    """
    try:
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP file")
        
        # Parse filenames if provided
        filename_list = []
        if filenames:
            try:
                filename_list = json.loads(filenames)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid filenames format")
        
        # Read ZIP file into memory
        zip_content = await file.read()
        zip_buffer = BytesIO(zip_content)
        
        extracted_files = []
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            # If no specific filenames provided, extract all session files
            if not filename_list:
                filename_list = [f.filename for f in zip_file.filelist if f.filename.endswith('.session')]
            
            for filename in filename_list:
                try:
                    # Read the file from ZIP
                    file_data = zip_file.read(filename)
                    logger.info(f"Extracted {filename}, size: {len(file_data)} bytes")
                    
                    # Encode as base64
                    encoded_content = base64.b64encode(file_data).decode('utf-8')
                    logger.info(f"Encoded {filename}, base64 length: {len(encoded_content)}")
                    
                    extracted_files.append({
                        "filename": filename,
                        "content": encoded_content,
                        "size": len(file_data)
                    })
                    
                except KeyError:
                    logger.warning(f"File {filename} not found in ZIP")
                    continue
                except Exception as e:
                    logger.error(f"Error extracting {filename}: {str(e)}")
                    continue
        
        if not extracted_files:
            raise HTTPException(status_code=400, detail="No session files could be extracted")
        
        return {
            "message": f"Extracted {len(extracted_files)} session files",
            "files": extracted_files,
            "total_files": len(extracted_files)
        }
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error extracting from ZIP file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error extracting from ZIP file")

@router.post("/download/{filename}")
async def download_session_file(file: UploadFile = File(...), filename: str = ""):
    """
    Download a specific session file from ZIP
    """
    try:
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP file")
        
        if not filename.endswith('.session'):
            raise HTTPException(status_code=400, detail="Filename must be a session file")
        
        # Read ZIP file into memory
        zip_content = await file.read()
        zip_buffer = BytesIO(zip_content)
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            try:
                # Read the file from ZIP
                file_data = zip_file.read(filename)
                
                # Create a streaming response
                file_buffer = BytesIO(file_data)
                file_buffer.seek(0)
                
                return StreamingResponse(
                    file_buffer,
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "Content-Length": str(len(file_data))
                    }
                )
                
            except KeyError:
                raise HTTPException(status_code=404, detail=f"File {filename} not found in ZIP")
            except Exception as e:
                logger.error(f"Error downloading {filename}: {str(e)}")
                raise HTTPException(status_code=500, detail="Error downloading file")
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error processing ZIP file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing ZIP file") 