const { ApiGateway } = require('./src/api/server');

async function startAndTest() {
  const gateway = new ApiGateway();
  await gateway.start(8080);
  console.log('API Gateway started');
  
  // 保持运行
  global.gateway = gateway;
  console.log('API Gateway running... (press Ctrl+C to stop)');
}

startAndTest().catch(console.error);
