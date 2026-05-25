#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST_PY="$ROOT/native-host/save_screenshot.py"
TEMPLATE="$ROOT/native-host/com.nitext.screenshot.saver.json"
HOST_NAME="com.nitext.screenshot.saver"
MANIFEST_NAME="${HOST_NAME}.json"

chmod +x "$HOST_PY"

if [[ $# -lt 1 ]]; then
  echo "Usage: ./install-native-host.sh <chrome-extension-id>"
  echo ""
  echo "Find the ID on chrome://extensions (Developer mode → ID under the extension name)."
  exit 1
fi

EXTENSION_ID="$1"
NATIVE_HOST_PATH="$HOST_PY"

HOST_DIRS=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
  "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
)

installed=0
for dir in "${HOST_DIRS[@]}"; do
  if [[ -d "$(dirname "$dir")" ]]; then
    mkdir -p "$dir"
    sed \
      -e "s|NATIVE_HOST_PATH|${NATIVE_HOST_PATH}|g" \
      -e "s|EXTENSION_ID|${EXTENSION_ID}|g" \
      "$TEMPLATE" > "$dir/$MANIFEST_NAME"
    echo "Installed: $dir/$MANIFEST_NAME"
    installed=1
  fi
done

if [[ $installed -eq 0 ]]; then
  echo "No Chrome/Chromium/Brave config folder found."
  exit 1
fi

echo ""
echo "Done. Reload QuickCap on chrome://extensions."
