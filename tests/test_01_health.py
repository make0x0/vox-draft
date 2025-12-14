from test_utils import BASE_URL
import requests

def run(result):
    url = f"{BASE_URL}/"
    result.log(f"Checking {url}")
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            result.log("Health Check OK (200)")
        elif resp.status_code == 404:
             # FastApi default root might check /docs or something. 
             # Our settings endpoint was mounted at /api/settings. 
             # Does root / exist? Let's check /api/settings/ instead as a health probe.
             url2 = f"{BASE_URL}/api/settings/"
             result.log(f"Root 404, checking {url2}")
             resp2 = requests.get(url2, timeout=5)
             if resp2.status_code == 200:
                  result.log("Settings Endpoint OK")
             else:
                  result.fail(f"Settings Endpoint returned {resp2.status_code}")
        else:
            result.fail(f"Returned {resp.status_code}")
    except Exception as e:
        result.fail(str(e))
