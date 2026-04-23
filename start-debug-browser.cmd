@echo off
chcp 65001 >nul
echo ================================================================
echo ChatKey 调试浏览器启动器
echo ================================================================
echo.
echo 此脚本将：
echo 1. 启动Chrome浏览器（使用独立配置）
echo 2. 打开所有AI平台页面
echo 3. 等待您手动登录
echo.
echo 请在弹出的Chrome窗口中登录各个AI平台...
echo 登录完成后，关闭窗口即可。
echo.
pause

node start-debug-browser.js

pause