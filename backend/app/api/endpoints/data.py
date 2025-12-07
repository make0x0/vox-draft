import shutil
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime

router = APIRouter()

DATA_DIR = "/data"

@router.get("/export")
def export_data():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.tar.gz"
    filepath = os.path.join("/tmp", filename)
    
    with tarfile.open(filepath, "w:gz") as tar:
        tar.add(DATA_DIR, arcname="data")
        
    return FileResponse(filepath, filename=filename, media_type="application/gzip")

@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    if not file.filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .tar.gz file.")

    temp_path = os.path.join("/tmp", f"restore_{datetime.now().strftime('%Y%m%d%H%M%S')}.tar.gz")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        with tarfile.open(temp_path, "r:gz") as tar:
            # Extract to root directory assuming archive contains "data/" prefix
            tar.extractall(path="/")
            
        return {"status": "success", "message": "Data restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restoration failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
