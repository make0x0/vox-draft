
import re

def parse_url(raw_endpoint):
    # Current Regex in config.py
    # match = re.search(r"(https?://[^/]+)(?:/openai/deployments/([^/]+))", raw_endpoint)
    
    # Proposed Regex (More robust)
    match = re.search(r"^(.*?)/openai/deployments/([^/]+)", raw_endpoint)
    
    if match:
        base = match.group(1) + "/"
        deployment = match.group(2)
        return base, deployment
    return None, None

test_cases = [
    # Standard Azure OpenAI
    "https://my-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01",
    # APIM / Custom Path
    "https://api.gateway.com/custom/path/openai/deployments/my-gpt/chat/completions",
    # Just the deployment base
    "https://resource.openai.azure.com/openai/deployments/whisper",
    # Invalid
    "https://google.com"
]

for url in test_cases:
    base, deploy = parse_url(url)
    print(f"URL: {url}\n  -> Base: {base}\n  -> Deploy: {deploy}\n")
