import sys
import os
import importlib.util
from glob import glob

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from test_utils import run_test_module

def main():
    print("========================================")
    print("VOX-DRAFT INTEGRATION TEST RUNNER")
    print("========================================")
    
    test_dir = os.path.dirname(os.path.abspath(__file__))
    test_files = sorted(glob(os.path.join(test_dir, "test_*.py")))
    
    # Filter out utils or others if needed
    test_files = [f for f in test_files if not f.endswith("test_utils.py")]
    
    results = []
    
    for fpath in test_files:
        module_name = os.path.basename(fpath).replace(".py", "")
        print(f"\nRunning {module_name}...")
        
        # Dynamic import
        spec = importlib.util.spec_from_file_location(module_name, fpath)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        if hasattr(module, "run"):
            res = run_test_module(module_name, module.run)
            results.append(res)
        else:
            print(f"Skipping {module_name} (no run() function)")
            
    print("\n========================================")
    print("TEST SUMMARY")
    print("========================================")
    all_pass = True
    for res in results:
        status = "PASS" if res.success else "FAIL"
        print(f"{res.name}: {status}")
        if not res.success:
            all_pass = False
            
    print("========================================")
    if all_pass:
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
