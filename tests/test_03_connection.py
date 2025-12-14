from test_utils import BASE_URL
import requests

def run(result):
    url = f"{BASE_URL}/api/settings/test"
    
    # Test 1: Expect Failure (Bad Azure Config)
    result.log("Running Azure Connection Failure Test...")
    bad_data = {
        "provider": "azure",
        "azure_openai_endpoint": "https://non-existent.openai.azure.com/",
        "azure_openai_api_key": "fake-key",
        "azure_openai_ad_token": ""
    }
    resp = requests.post(url, json=bad_data)
    if resp.status_code == 200:
        body = resp.json()
        if body.get('ok') is False:
             result.log("Success: Correctly reported failure for bad config.")
        else:
             result.fail(f"Unexpected Success for bad config: {body}")
    else:
        # 500 etc is technically a test failure, we expect 200 with ok=False handled by backend
        result.fail(f"HTTP Status {resp.status_code} (Expected 200 with ok=False)")

    # Test 2: Invalid Provider
    result.log("Running Unknown Provider Test...")
    resp2 = requests.post(url, json={"provider": "unknown_provider"})
    if resp2.status_code == 200:
         body = resp2.json()
         if body.get('ok') is False:
             result.log("Success: Correctly handled unknown provider.")
         else:
             result.fail("Unexpected Success for unknown provider")
             
    # Test 3: OpenAI (Mocked/Lightweight - expects Env Var if not provided)
    # We won't test successful connection here unless we know we have keys. 
    # But we can try to trigger 'Missing Key' error if we send empty key and disable env fallback?
    # Backend falls back to env. So if env keys are present, it might succeed.
    # Let's verify it doesn't crash at least.
    result.log("Running OpenAI Env Fallback Check...")
    resp3 = requests.post(url, json={"provider": "openai"}) # No keys provided
    if resp3.status_code == 200:
        result.log(f"OpenAI Check result: {resp3.json()}")
    else:
        result.fail(f"OpenAI Check crashed: {resp3.status_code}")
