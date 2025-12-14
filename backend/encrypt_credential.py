#!/usr/bin/env python3
"""
CLI tool to encrypt credentials using the public key.

Usage:
    python encrypt_credential.py "your-api-key"
    python encrypt_credential.py --file secrets.txt
"""

import sys
import argparse
from pathlib import Path

# Add app to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.services.crypto import encrypt, ensure_keypair, PUBLIC_KEY_FILE


def main():
    parser = argparse.ArgumentParser(
        description="Encrypt credentials using the public key"
    )
    parser.add_argument(
        "value",
        nargs="?",
        help="The value to encrypt"
    )
    parser.add_argument(
        "--file", "-f",
        help="Read value from file"
    )
    parser.add_argument(
        "--generate-keys", "-g",
        action="store_true",
        help="Generate keypair if not exists"
    )
    
    args = parser.parse_args()
    
    # Generate keys if requested or if they don't exist
    if args.generate_keys or not PUBLIC_KEY_FILE.exists():
        print("Checking keypair...")
        ensure_keypair()
    
    # Get value to encrypt
    if args.file:
        with open(args.file, "r") as f:
            value = f.read().strip()
    elif args.value:
        value = args.value
    else:
        # Interactive mode
        print("Enter the value to encrypt (will not be echoed):")
        import getpass
        value = getpass.getpass(prompt="")
    
    if not value:
        print("Error: No value provided", file=sys.stderr)
        sys.exit(1)
    
    # Encrypt
    try:
        encrypted = encrypt(value)
        print("\n" + "=" * 60)
        print("Encrypted value:")
        print("=" * 60)
        print(encrypted)
        print("=" * 60)
        print("\nCopy this value to your .env file, e.g.:")
        print(f"OPENAI_API_KEY={encrypted}")
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Run with --generate-keys to create the keypair first.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
