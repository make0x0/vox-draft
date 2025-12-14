from test_utils import BASE_URL
import requests

def run(result):
    # 1. Create Session
    url = f"{BASE_URL}/api/sessions/"
    data = {"title": "Test Session", "summary": "Initial Summary"}
    result.log(f"Creating Session: {data}")
    
    resp = requests.post(url, json=data)
    if resp.status_code != 200:
        result.fail(f"Create failed: {resp.status_code}")
        return
        
    session = resp.json()
    session_id = session['id']
    result.log(f"Created Session ID: {session_id}")
    
    # 2. Update Session
    update_data = {"title": "Updated Title", "color": "red"}
    result.log(f"Updating Session: {update_data}")
    resp = requests.patch(f"{url}{session_id}", json=update_data)
    if resp.status_code != 200:
        result.fail(f"Update failed: {resp.status_code}")
    else:
        updated = resp.json()
        if updated['title'] != "Updated Title" or updated['color'] != "red":
            result.fail("Update content mismatch")
            
    # 3. List Sessions (Verify existence)
    resp = requests.get(url)
    sessions = resp.json()
    found = any(s['id'] == session_id for s in sessions)
    if not found:
        result.fail("Created session not found in list")
        
    # 4. Soft Delete
    result.log("Soft Deleting Session...")
    resp = requests.delete(f"{url}{session_id}")
    if resp.status_code != 200:
        result.fail(f"Delete failed: {resp.status_code}")
        
    # Verify is_deleted flag in Detail
    resp = requests.get(f"{url}{session_id}")
    if resp.status_code != 200:
        result.fail("Get Detail failed")
    else:
        detail = resp.json()
        if detail['is_deleted'] is not True:
            result.fail("is_deleted flag is not True after delete")
        else:
            result.log("Session correctly marked as deleted")

    # 5. Restore
    result.log("Restoring Session...")
    resp = requests.post(f"{url}{session_id}/restore")
    if resp.status_code != 200:
        result.fail("Restore failed")
    else:
        detail = resp.json()
        if detail['is_deleted'] is not False:
            result.fail("is_deleted flag is not False after restore")

    # 6. Hard Delete (Empty Trash)
    # First soft delete again
    requests.delete(f"{url}{session_id}")
    
    result.log("Emptying Trash...")
    resp = requests.delete(f"{url}trash/empty")
    if resp.status_code != 200:
        result.fail("Empty Trash failed")
    else:
        res_data = resp.json()
        result.log(f"Empty Trash Result: {res_data}")
        
    # Verify it's gone (Get should 404? Or just not exist?)
    # Backend get_session raises 404 if not found.
    resp = requests.get(f"{url}{session_id}")
    if resp.status_code == 404:
        result.log("Session correctly 404s after hard delete")
    else:
        result.fail(f"Session still exists after hard delete? Status: {resp.status_code}")
