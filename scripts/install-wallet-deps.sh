#!/bin/bash

# Install missing crypto dependencies for wallet services
echo "Installing missing crypto dependencies..."

cd /Users/neilbatchelor/Cursor/Chain\ Capital\ Production-build-progress/backend

# Install ecpair package for Bitcoin signing
pnpm add ecpair

echo "Dependencies installed successfully!"
