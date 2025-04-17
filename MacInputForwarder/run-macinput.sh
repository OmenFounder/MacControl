#!/bin/bash

BINARY_PATH="/Users/jonathanday/Projects/MacControl/MacInputForwarder/.build/debug/MacInputForwarder"
USER_ID=$(id -u)
USER_NAME=$(whoami)

# Get the correct GUI session (usually loginwindow is PID 1 for GUI)
GUI_PID=$(pgrep -u "$USER_NAME" -n loginwindow)

if [ -z "$GUI_PID" ]; then
  echo "❌ Could not find loginwindow GUI session for $USER_NAME"
  exit 1
fi

# Use launchctl asuser with correct context
echo "🟢 Launching MacInputForwarder into GUI session..."
sudo launchctl asuser "$USER_ID" sudo -u "$USER_NAME" "$BINARY_PATH"
