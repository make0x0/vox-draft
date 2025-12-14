from test_utils import BASE_URL
import requests

def run(result):
    url = f"{BASE_URL}/api/templates/"
    
    # 1. List
    resp = requests.get(url)
    if resp.status_code != 200:
        result.fail("List failed")
        return
    templates = resp.json()
    
    # Find System Template
    sys_tmpl = next((t for t in templates if t.get('is_system')), None)
    if sys_tmpl:
        result.log(f"Found System Template: {sys_tmpl['title']}")
        # 2. Try Delete
        del_resp = requests.delete(f"{url}{sys_tmpl['id']}")
        if del_resp.status_code == 400:
             result.log("Correctly prevented deletion of system template")
        else:
             result.fail(f"Allowed deletion of system template? Code: {del_resp.status_code}")
    else:
        result.log("No system templates found to test protection")

    # 3. Create User Template
    new_tmpl = {"title": "Test Template", "content": "Test Content", "is_system": False}
    resp = requests.post(url, json=new_tmpl)
    if resp.status_code != 200:
        result.fail("Create failed")
        return
    t_id = resp.json()['id']
    result.log(f"Created Template {t_id}")

    # 4. Update
    resp = requests.put(f"{url}{t_id}", json={"title": "Updated Template"})
    if resp.status_code != 200:
        result.fail("Update failed")
    else:
        if resp.json()['title'] != "Updated Template":
            result.fail("Update content mismatch")

    # 5. Delete
    resp = requests.delete(f"{url}{t_id}")
    if resp.status_code != 200:
        result.fail("Delete failed")
    else:
        result.log("Deleted User Template")
