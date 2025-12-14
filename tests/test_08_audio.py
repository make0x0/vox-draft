from test_utils import BASE_URL
import requests
import os

def run(result):
    # Prepare dummy file
    dummy_file_path = "tests/dummy.mp3"
    with open(dummy_file_path, "wb") as f:
        f.write(b"dummy audio content")
        
    try:
        url = f"{BASE_URL}/api/audio/upload"
        
        # 1. Upload without Session ID (New Session)
        with open(dummy_file_path, "rb") as f:
            files = {'file': ('dummy.mp3', f, 'audio/mpeg')}
            # Note: Do not send session_id
            resp = requests.post(url, files=files)
            
        if resp.status_code != 200:
            result.fail(f"Upload New failed: {resp.status_code}")
            return
            
        data = resp.json()
        session_id = data['session_id']
        block_id = data['block_id']
        file_path_container = data['file_path']
        
        result.log(f"Created Session {session_id}, Block {block_id}")
        
        # Verify Session/Block Existence
        s_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        if s_resp.status_code != 200:
            result.fail("Session verify get failed")
        
        # Verify File on Host (Volume Mapping Check)
        # Container: /data/session_id/audio/filename
        # Host: data/session_id/audio/filename
        # Docker: /data/session_id/audio/filename
        # Volume: ./data:/data
        rel_path = file_path_container.replace("/data/", "")
        host_path = os.path.join("data", rel_path)
        
        if os.path.exists(host_path):
            result.log(f"Verified physical file: {host_path}")
        else:
            result.log(f"Warning: Physical file not found at {host_path}. Volume mapping might differ or running inside container?")

        # 2. Upload with Session ID
        with open(dummy_file_path, "rb") as f:
            files = {'file': ('dummy2.mp3', f, 'audio/mpeg')}
            data_form = {'session_id': session_id}
            resp = requests.post(url, files=files, data=data_form)
            
        if resp.status_code != 200:
             result.fail("Upload Existing Session failed")
        else:
             data2 = resp.json()
             if data2['session_id'] != session_id:
                  result.fail("Session ID mismatch on second upload")
                  
        # Cleanup
        # Delete Session (should delete files too via Empty Trash)
        requests.delete(f"{BASE_URL}/api/sessions/{session_id}") # Soft
        requests.delete(f"{BASE_URL}/api/sessions/trash/empty") # Hard
        
    finally:
        if os.path.exists(dummy_file_path):
            os.remove(dummy_file_path)
