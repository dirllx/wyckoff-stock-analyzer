#!/usr/bin/env python3
# 根据文件扩展名设置正确的MIME类型

import http.server
import socketserver
import os
import mimetypes

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        content_type = mimetypes.guess_type(self.path)
        if content_type is None or content_type == 'application/octet-stream':
            # 默认为HTML（如果无法识别类型）
            if self.path.endswith('.html') or self.path.endswith('/'):
                content_type = 'text/html; charset=utf-8'
            elif self.path.endswith('.js'):
                content_type = 'text/javascript; charset=utf-8'
            elif self.path.endswith('.css'):
                content_type = 'text/css; charset=utf-8'
        
        if content_type:
            self.send_header('Content-Type', content_type)
        
        super().end_headers()

print(f"启动HTTP服务器，端口 {PORT}...")
print("自动识别文件类型并设置正确的Content-Type")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as server:
    print(f"服务器运行中，访问 http://localhost:{PORT}")
    server.serve_forever()
