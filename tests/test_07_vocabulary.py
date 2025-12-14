from test_utils import BASE_URL
import requests

def run(result):
    url = f"{BASE_URL}/api/vocabulary/"
    
    # 1. Create
    data = {"word": "TestWord", "reading": "testword"}
    resp = requests.post(url, json=data)
    if resp.status_code != 200:
        result.fail("Create failed")
        return
    item = resp.json()
    item_id = item['id']
    result.log(f"Created Vocabulary {item_id}")
    
    # 2. List & Verify
    resp = requests.get(url)
    items = resp.json()
    if not any(i['id'] == item_id for i in items):
        result.fail("Created item not found in list")
        
    # 3. Update
    resp = requests.put(f"{url}{item_id}", json={"reading": "updated_reading"})
    if resp.status_code != 200:
        result.fail("Update failed")
    else:
        if resp.json()['reading'] != "updated_reading":
             result.fail("Update content mismatch")
             
    # 4. Delete
    resp = requests.delete(f"{url}{item_id}")
    if resp.status_code != 200:
        result.fail("Delete failed")
    else:
        result.log("Deleted Vocabulary Item")
