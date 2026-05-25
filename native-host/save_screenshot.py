#!/usr/bin/env python3
"""Chrome native messaging host: write screenshot PNGs to a folder on disk."""

import base64
import json
import os
import struct
import sys
from pathlib import Path


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack("<I", raw_length)[0]
    payload = sys.stdin.buffer.read(length)
    return json.loads(payload.decode("utf-8"))


def send_message(obj):
    encoded = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def resolve_directory(directory: str) -> Path:
    expanded = os.path.expanduser(directory.strip())
    path = Path(expanded)
    if not path.is_absolute():
        path = Path.home() / path
    return path.resolve()


def main():
    message = read_message()
    if message is None:
        return

    try:
        if message.get("action") != "save":
            send_message({"ok": False, "error": "Unknown action"})
            return

        directory = resolve_directory(message["directory"])
        filename = message.get("filename") or "screenshot.png"
        data = message.get("data", "")
        if "," in data:
            data = data.split(",", 1)[1]

        directory.mkdir(parents=True, exist_ok=True)
        filepath = directory / filename
        filepath.write_bytes(base64.b64decode(data))

        send_message({"ok": True, "path": str(filepath), "filename": filename})
    except Exception as exc:
        send_message({"ok": False, "error": str(exc)})


if __name__ == "__main__":
    main()
