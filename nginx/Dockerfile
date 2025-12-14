FROM nginx:alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl bash

# Copy configuration and scripts
COPY nginx.conf /etc/nginx/nginx.conf
COPY generate-cert.sh /docker-entrypoint.d/generate-cert.sh

# Make script executable
RUN chmod +x /docker-entrypoint.d/generate-cert.sh

EXPOSE 443
