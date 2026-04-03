#!/bin/bash
export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH
source "$(dirname "$0")/venv/bin/activate"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
