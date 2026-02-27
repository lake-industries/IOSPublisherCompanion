#!/bin/bash
# Eco Agent startup script (for Unix/Mac/WSL)

echo "🌱 Starting Eco Agent..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed"
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Load environment
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp .env.example .env
fi

# Create logs directory
mkdir -p logs

# Start agent
echo "▶️  Starting agent process..."
node index.js
