#!/usr/bin/env bash
set -e

echo "==================================================="
echo "PharmaTrack - Pharmacy Inventory Management System"
echo "Automated Setup Script"
echo "==================================================="

cd "$(dirname "$0")/.."

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 20 LTS."
    exit 1
fi

echo "Installing all dependencies..."
npm install

if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "Please configure your credentials in .env.local"
fi

echo "==================================================="
echo "Dependencies installed successfully!"
echo "Next steps:"
echo "  1. Apply migrations in Supabase SQL editor"
echo "  2. npm run seed"
echo "  3. npm run dev"
echo "==================================================="
