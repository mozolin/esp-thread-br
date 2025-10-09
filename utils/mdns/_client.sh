#!/usr/bin/env bash

echo "========================================"
echo "   mDNS Discovery Tool Launcher"
echo "========================================"
echo

echo "Starting Chrome with mDNS interface..."
google-chrome --start-fullscreen --disable-application-cache "http://localhost:3000/" &

echo "Waiting for server to start..."
sleep 2

echo
echo "If Chrome doesn't open automatically:"
echo "1. Make sure Chrome is installed"
echo "2. Check if it's in your PATH"
echo "3. Or manually open: http://localhost:3000/"
echo
read -p "Press Enter to continue..."
