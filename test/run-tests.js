/**
 * 简化的测试运行器
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 ChatKey Test Runner');
console.log('='.repeat(50));

const rootDir = process.cwd();

// 运行独立的 Node.js 脚本
const tests = [
  {
    name: 'Provider Registry',
    command: 'node -e "'
      + 'const {providerRegistry} = require(\"./src/shared/providers\");'
      + 'providerRegistry.loadDefaultProviders();'
      + 'const types = providerRegistry.getRegisteredTypes();'
      + 'console.log(\"Registered:\", types.join(\", \"));'
      + 'if (types.length < 4) throw new Error(\"Not enough providers\");'
      + 'console.log(\"✅ PASS\")"'
  },
  {
    name: 'Answer Adapter',
    command: 'node -e "'
      + 'const {AnswerAdapter} = require(\"./src/main/answer-adapter\");'
      + 'const result = AnswerAdapter.adapt(\'测试\\n\\n\`\`\`python\\nprint(1)\\n\`\`\`\', \"test\");'
      + 'if (!result.codeBlocks?.length) throw new Error(\"No code blocks\");'
      + 'if (result.codeBlocks[0].language !== \"python\") throw new Error(\"Wrong lang\");'
      + 'console.log(\"Code blocks:\", result.codeBlocks);'
      + 'console.log(\"✅ PASS\")"'
  },
  {
    name: 'Database Init',
    command: 'node -e "'
      + 'const {DatabaseManager} = require(\"./src/shared/database\");'
      + 'const db = new DatabaseManager();'
      + 'db.init().then(() => db.query(\'SELECT 1\')).then(() => {'
      + '  console.log(\"✅ PASS\");'
      + '  return db.close();'
      + '}).catch(e => { console.error(e.message); process.exit(1); })"'
  },
  {
    name: 'Config Manager',
    command: 'node -e "'
      + 'const {ConfigManager} = require(\"./src/shared/config\");'
      + 'const {DatabaseManager} = require(\"./src/shared/database\");'
      + '(async () => {'
      + '  const db = new DatabaseManager();'
      + '  await db.init();'
      + '  const config = new ConfigManager(db);'
      + '  const val = await config.get(\"test\", \"default\");'
      + '  console.log(\"Config value:\", val);'
      + '  console.log(\"✅ PASS\");'
      + '  await db.close();'
      + '})()"'
  }
];

let passed = 0;
let failed = 0;

async function runCommand(name, command) {
  console.log(`\n📋 ${name}`);
  try {
    const result = execSync(command, { 
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000
    });
    console.log(result.trim());
    passed++;
  } catch (error) {
    console.error('   ❌ FAILED');
    if (error.stdout) console.error('   Output:', error.stdout.trim().slice(-200));
    if (error.stderr) console.error('   Error:', error.stderr.trim().slice(-200));
    failed++;
  }
}

async function runAll() {
  for (const test of tests) {
    await runCommand(test.name, test.command);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('Runner error:', err);
  process.exit(1);
});