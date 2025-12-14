import requests

url = "http://localhost:8000/api/settings/test"
data = {
    "provider": "azure",
    "azure_openai_endpoint": "https://non-existent-endpoint-12345.openai.azure.com/",
    "azure_openai_api_key": "fake-key",
    "azure_openai_ad_token": ""
}

try:
    print(f"Sending request to {url} with data: {data}")
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
except Exception as e:
    print(f"Request failed: {e}")
