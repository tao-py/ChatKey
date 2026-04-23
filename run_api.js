const { ApiGateway } = require('./src/api/server');

async function startAPI() {
  const gateway = new ApiGateway();
  await gateway.start(8080);
  console.log('✅ API Gateway running on port 8080');
  console.log('Press Ctrl+C to stop');
  
  // 保持运行
  process.on('SIGINT', async () => {
    await gateway.stop();
    process.exit(0);
  });
}

startAPI().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
