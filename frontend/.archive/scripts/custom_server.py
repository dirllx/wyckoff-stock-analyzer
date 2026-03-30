#!/usr/bin/env python3
# 自定义MIME类型的HTTP服务器

import http.server
import socketserver
import os

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        super().end_headers()

PORT = 3000
Handler = MyHTTPRequestHandler

print(f"启动自定义MIME类型HTTP服务器，端口 {PORT}...")
print("所有文件将被视为 text/html")

with socketserver.TCPServer(("", PORT), Handler) as server:
    print(f"服务器运行中，访问 http://localhost:{PORT}")
    server.serve_forever()
