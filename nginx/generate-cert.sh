#!/bin/bash
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
CONFIG_FILE="$CERT_DIR/.cert_config"

# Default values
CERT_DAYS="${CERT_DAYS:-365}"
CERT_HOSTS="${CERT_HOSTS:-localhost}"
CERT_IPS="${CERT_IPS:-127.0.0.1}"

# Create cert directory if not exists
mkdir -p "$CERT_DIR"

# Build SAN (Subject Alternative Name) string
build_san() {
    local san=""
    
    # Add DNS entries
    IFS=',' read -ra HOSTS <<< "$CERT_HOSTS"
    for host in "${HOSTS[@]}"; do
        host=$(echo "$host" | xargs)  # trim whitespace
        if [ -n "$host" ]; then
            if [ -n "$san" ]; then san="${san},"; fi
            san="${san}DNS:${host}"
        fi
    done
    
    # Add IP entries
    IFS=',' read -ra IPS <<< "$CERT_IPS"
    for ip in "${IPS[@]}"; do
        ip=$(echo "$ip" | xargs)  # trim whitespace
        if [ -n "$ip" ]; then
            if [ -n "$san" ]; then san="${san},"; fi
            san="${san}IP:${ip}"
        fi
    done
    
    echo "$san"
}

# Get current config hash
get_config_hash() {
    echo "${CERT_HOSTS}|${CERT_IPS}|${CERT_DAYS}" | md5sum | cut -d' ' -f1
}

# Check if certificate needs regeneration
needs_regeneration() {
    # Check if certificate exists
    if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
        echo "Certificate files not found"
        return 0
    fi
    
    # Check if config changed
    local current_hash=$(get_config_hash)
    if [ -f "$CONFIG_FILE" ]; then
        local stored_hash=$(cat "$CONFIG_FILE")
        if [ "$current_hash" != "$stored_hash" ]; then
            echo "Configuration changed (hosts/IPs updated)"
            return 0
        fi
    else
        echo "No config file found"
        return 0
    fi
    
    # Check if certificate is expired or will expire within 7 days
    if ! openssl x509 -checkend 604800 -noout -in "$CERT_FILE" 2>/dev/null; then
        echo "Certificate expired or will expire within 7 days"
        return 0
    fi
    
    return 1
}

# Generate certificate
generate_certificate() {
    local san=$(build_san)
    echo "Generating certificate with SAN: $san"
    echo "Validity: $CERT_DAYS days"
    
    openssl req -x509 -nodes -days "$CERT_DAYS" -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=vox-draft" \
        -addext "subjectAltName=$san" \
        2>/dev/null
    
    # Store config hash
    get_config_hash > "$CONFIG_FILE"
    
    echo "=== Certificate generated successfully ==="
    echo "Hosts: $CERT_HOSTS"
    echo "IPs: $CERT_IPS"
    echo "Valid for: $CERT_DAYS days"
}

# Main logic
echo "=== Certificate Check ==="
if reason=$(needs_regeneration); then
    echo "Reason: $reason"
    generate_certificate
else
    echo "Using existing certificate (still valid)"
    # Show expiry date
    expiry=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
    echo "Expires: $expiry"
fi
