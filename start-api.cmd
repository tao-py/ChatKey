# 启动 ChatKey 开发环境
# 步骤：
# 1. 确保 MySQL 容器运行: docker start chatkey-mysql
# 2. 运行此脚本启动后端 API
# 3. 在另一个终端运行: cd src/renderer && npm start

echo "Starting ChatKey API Server..."
cd src/api
node server.js
