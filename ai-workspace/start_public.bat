@echo off
title AI Workspace - Public
cd /d "%~dp0"
echo 🚀 Starting server + ngrok...
python start_public.py
pause