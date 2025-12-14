import requests
import sys
import json

BASE_URL = "http://localhost:8000"

class TestResult:
    def __init__(self, name):
        self.name = name
        self.success = True
        self.logs = []

    def log(self, message):
        self.logs.append(message)
        print(f"[{self.name}] {message}")

    def fail(self, message):
        self.success = False
        self.log(f"FAIL: {message}")

    def pass_test(self):
        self.log("PASS")

def run_test_module(module_name, test_func):
    result = TestResult(module_name)
    try:
        test_func(result)
    except Exception as e:
        result.fail(f"Exception: {e}")
    return result
