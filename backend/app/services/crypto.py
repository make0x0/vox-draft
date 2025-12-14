"""
Credential Encryption Service

RSA-2048 public-key encryption for API keys and other sensitive credentials.
Encrypted values use the prefix "ENC:" to be easily identified.

Usage:
    from app.services.crypto import encrypt, decrypt, ensure_keypair
    
    # Ensure keys exist (called on startup)
    ensure_keypair()
    
    # Encrypt a value
    encrypted = encrypt("my-secret-key")  # Returns "ENC:xxxxxxxx"
    
    # Decrypt a value
    decrypted = decrypt("xxxxxxxx")  # Returns "my-secret-key"
"""

import os
import base64
from pathlib import Path
from typing import Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

# Key file paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
KEYS_DIR = BASE_DIR / "data" / "keys"
PUBLIC_KEY_FILE = KEYS_DIR / "public.pem"
PRIVATE_KEY_FILE = KEYS_DIR / "private.pem"

# Encrypted value prefix
ENC_PREFIX = "ENC:"


def ensure_keypair() -> bool:
    """
    Ensure RSA keypair exists. Generate if not present.
    Returns True if keys were generated, False if already existed.
    """
    KEYS_DIR.mkdir(parents=True, exist_ok=True)
    
    if PUBLIC_KEY_FILE.exists() and PRIVATE_KEY_FILE.exists():
        print(f"[Crypto] Keypair already exists at {KEYS_DIR}")
        return False
    
    print(f"[Crypto] Generating new RSA-2048 keypair...")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Serialize and save private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    PRIVATE_KEY_FILE.write_bytes(private_pem)
    os.chmod(PRIVATE_KEY_FILE, 0o600)  # Restrict permissions
    
    # Serialize and save public key
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    PUBLIC_KEY_FILE.write_bytes(public_pem)
    
    print(f"[Crypto] Keypair generated successfully:")
    print(f"  - Public key:  {PUBLIC_KEY_FILE}")
    print(f"  - Private key: {PRIVATE_KEY_FILE}")
    print(f"[Crypto] WARNING: Keep private.pem secure and never commit it!")
    
    return True


def _load_public_key():
    """Load public key from file."""
    if not PUBLIC_KEY_FILE.exists():
        raise FileNotFoundError(f"Public key not found: {PUBLIC_KEY_FILE}")
    
    public_pem = PUBLIC_KEY_FILE.read_bytes()
    return serialization.load_pem_public_key(public_pem, backend=default_backend())


def _load_private_key():
    """Load private key from file."""
    if not PRIVATE_KEY_FILE.exists():
        raise FileNotFoundError(f"Private key not found: {PRIVATE_KEY_FILE}")
    
    private_pem = PRIVATE_KEY_FILE.read_bytes()
    return serialization.load_pem_private_key(private_pem, password=None, backend=default_backend())


def encrypt(plaintext: str) -> str:
    """
    Encrypt a string using the public key.
    Returns the encrypted value with ENC_PREFIX.
    """
    public_key = _load_public_key()
    
    plaintext_bytes = plaintext.encode('utf-8')
    
    ciphertext = public_key.encrypt(
        plaintext_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Base64 encode for safe storage
    encoded = base64.b64encode(ciphertext).decode('ascii')
    return f"{ENC_PREFIX}{encoded}"


def decrypt(ciphertext: str) -> str:
    """
    Decrypt a string using the private key.
    Accepts with or without ENC_PREFIX.
    """
    # Remove prefix if present
    if ciphertext.startswith(ENC_PREFIX):
        ciphertext = ciphertext[len(ENC_PREFIX):]
    
    private_key = _load_private_key()
    
    # Base64 decode
    ciphertext_bytes = base64.b64decode(ciphertext)
    
    plaintext_bytes = private_key.decrypt(
        ciphertext_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return plaintext_bytes.decode('utf-8')


def is_encrypted(value: str) -> bool:
    """Check if a value is encrypted (has ENC: prefix)."""
    return value.startswith(ENC_PREFIX)


def decrypt_if_encrypted(value: str) -> str:
    """
    Decrypt value if it's encrypted, otherwise return as-is.
    This is the main function used by config loading.
    """
    if not value:
        return value
    
    if is_encrypted(value):
        try:
            return decrypt(value)
        except Exception as e:
            print(f"[Crypto] WARNING: Failed to decrypt value: {e}")
            return value
    
    return value
