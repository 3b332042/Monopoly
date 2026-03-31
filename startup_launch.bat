@echo off
cd /d "c:\Users\a9804\Desktop\VSCODE\Monopoly"
echo Starting Monopoly Local Server...
echo Please do not close this window while playing.
start "" http://localhost:8000
python -m http.server 8000
