// 日志工具类 - 提供统一的日志记录功能
class Logger {
  constructor(name) {
    this.name = name;
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`;
    
    console.log(logMessage, ...args);
    
    // 这里可以扩展为写入日志文件或发送到日志服务
    // 例如：this.writeToFile(logMessage);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }
}

module.exports = { Logger };