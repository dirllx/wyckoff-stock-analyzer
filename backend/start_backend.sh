#!/bin/bash

# 安装所有依赖
pip3 install loguru sqlalchemy pandas numpy easyquotation akshare fastapi uvicorn python-multipart pydantic -q 2>/dev/null

# 启动后端
cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
