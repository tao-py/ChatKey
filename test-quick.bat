@echo off
echo ========================================
echo ChatKey 快速测试脚本
echo ========================================
echo.

echo [1/6] 检查环境...
if not exist ".env" (
    echo [错误] 未找到 .env 文件
    echo 请复制 .env.example 并配置数据库连接
    pause
    exit /b 1
)
echo ✅ 环境变量文件存在

echo.
echo [2/6] 检查 MySQL 连接...
mysql -u root -p%DB_PASSWORD% -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [警告] MySQL 连接失败
    echo 请确保 MySQL 已启动:
    echo   docker start chatkey-mysql
    echo  或启动本地 MySQL 服务
    echo.
    choice /C YN /M "是否继续测试（部分功能可能失败）"
    if errorlevel 2 exit /b 0
) else (
    echo ✅ MySQL 连接正常
)

echo.
echo [3/6] 测试 Provider 注册系统...
node -e "const { ProviderRegistry } = require('./src/shared/providers'); console.log('✅ Provider 注册:', ProviderRegistry.getInstance().getAllProviders().map(p => p.name).join(', '));" 2>nul
if errorlevel 1 (
    echo ❌ Provider 注册测试失败
) else (
    echo ✅ Provider 注册测试通过
)

echo.
echo [4/6] 测试配置管理...
node -e "const { ConfigManager } = require('./src/shared/config'); console.log('✅ 配置读取正常，并发数:', ConfigManager.getInstance().get('system.maxConcurrent'));" 2>nul
if errorlevel 1 (
    echo ❌ 配置管理测试失败
) else (
    echo ✅ 配置管理测试通过
)

echo.
echo [5/6] 测试 API 网关...
echo 正在启动 API 服务器...
start /b node src/api/server.js
timeout /t 3 >nul

curl -s http://localhost:8080/v1/models >nul 2>&1
if errorlevel 1 (
    echo ❌ API 网关测试失败（端口可能被占用）
) else (
    echo ✅ API 网关响应正常
)

taskkill /f /im node.exe >nul 2>&1

echo.
echo [6/6] 检查前端依赖...
if not exist "src/renderer/node_modules" (
    echo [警告] 前端依赖未安装
    echo 运行: cd src/renderer && npm install
) else (
    echo ✅ 前端依赖已安装
)

echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 下一步操作:
echo   1. 确保 MySQL 运行: docker start chatkey-mysql
echo   2. 初始化数据库: npm run init-db
echo   3. 登录 AI 网站（DeepSeek、通义千问等）
echo   4. 启动应用: npm run dev
echo   5. 访问: http://127.0.0.1:3001
echo.
pause
