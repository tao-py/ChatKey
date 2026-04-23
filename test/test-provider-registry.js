/**
 * 独立测试文件：Provider Registry
 */

try {
  const { providerRegistry } = require('../src/shared/providers');
  
  // 加载默认 Provider
  providerRegistry.loadDefaultProviders();
  
  const types = providerRegistry.getRegisteredTypes();
  console.log('Registered providers:', types.join(', '));
  
  if (types.length < 4) {
    throw new Error(`Expected at least 4 providers, got ${types.length}`);
  }
  
  // 验证每个 Provider 信息
  for (const type of types) {
    const info = providerRegistry.getProviderInfo(type);
    if (!info) {
      throw new Error(`No info for provider ${type}`);
    }
    console.log(`  ✓ ${type}: ${info.name} (capabilities: ${Object.keys(info.capabilities).filter(k => info.capabilities[k]).join(', ')})`);
  }
  
  console.log('✅ PASS');
  process.exit(0);
} catch (error) {
  console.error('❌ FAILED:', error.message);
  process.exit(1);
}