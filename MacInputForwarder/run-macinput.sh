#!/bin/bash

LABEL="com.macinput.forwarder"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
PROJECT_DIR="/Users/jonathanday/Projects/MacControl"
BINARY_PATH="$PROJECT_DIR/MacInputForwarder/.build/debug/MacInputForwarder"
USER_ID=$(id -u)
USER_NAME=$(whoami)

# Ensure the binary is built
echo "🔨 Building Swift project..."
cd "$PROJECT_DIR/MacInputForwarder"
swift build || { echo "❌ Build failed!"; exit 1; }

# Create LaunchAgent .plist if missing
if [ ! -f "$PLIST_PATH" ]; then
  echo "📄 Creating LaunchAgent plist at $PLIST_PATH"
  cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BINARY_PATH</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/$LABEL.out.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/$LABEL.err.log</string>
</dict>
</plist>
EOF
fi

# Stop if already running
echo "🛑 Unloading previous instance (if any)..."
launchctl bootout gui/$USER_ID "$PLIST_PATH" 2>/dev/null

# Start fresh
echo "🚀 Launching MacInputForwarder via launchctl..."
launchctl bootstrap gui/$USER_ID "$PLIST_PATH"
launchctl enable gui/$USER_ID/$LABEL

echo "✅ MacInputForwarder is now running in the GUI session"
