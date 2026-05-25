# QuickCap

1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder
2. One-time native helper setup (Terminal, from this folder):

   ```bash
   ./install-native-host.sh <chrome-extension-id>
   ```

   Then **reload** the extension on `chrome://extensions`.

3. Open any website (not `chrome://` pages)
4. **Choose folder** → set **File name pattern** → **Capture & save**

Files are saved as `pattern-1.png`, `pattern-2.png`, etc. Chrome remembers your folder until you pick another.
