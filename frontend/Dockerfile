FROM nginx:alpine

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制前端静态文件
COPY index.html /usr/share/nginx/html/index.html
COPY check_indicators.js /usr/share/nginx/html/check_indicators.js

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
