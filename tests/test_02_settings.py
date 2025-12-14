from test_utils import BASE_URL
import requests

def run(result):
    # 1. GET Settings
    url = f"{BASE_URL}/api/settings/"
    result.log(f"GET {url}")
    resp = requests.get(url)
    if resp.status_code != 200:
        result.fail(f"GET failed: {resp.status_code}")
        return
    
    data = resp.json()
    result.log(f"Current Settings keys: {list(data.keys())}")
    
    # 2. PATCH Settings (Update language to 'en' then back to original)
    original_lang = data.get('language', 'ja')
    target_lang = 'en' if original_lang == 'ja' else 'ja'
    
    result.log(f"Testing Update: {original_lang} -> {target_lang}")
    
    patch_url = f"{BASE_URL}/api/settings/"
    patch_resp = requests.patch(patch_url, json={"language": target_lang})
    if patch_resp.status_code != 200:
        result.fail(f"PATCH failed: {patch_resp.status_code}")
        return
        
    updated_data = patch_resp.json()
    if updated_data.get('language') != target_lang:
        result.fail("Update did not persist in response")
        return
        
    # Revert
    requests.patch(patch_url, json={"language": original_lang})
    result.log("Reverted settings change")
    
