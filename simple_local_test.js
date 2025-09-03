// simple_local_test.js - فحص مبسط للتأكد من عمل التطبيق محلياً

async function testLocalAPI() {
  console.log('🏠 Testing local application...');
  
  const tests = [
    { name: 'Home Page', url: 'http://localhost:5000/' },
    { name: 'API Projects', url: 'http://localhost:5000/api/projects' },
    { name: 'API Worker Types', url: 'http://localhost:5000/api/worker-types' }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`   Content-Type: ${contentType}`);
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            const isArray = Array.isArray(data);
            const hasData = data && data.data !== undefined;
            
            console.log(`   ✅ JSON Response`);
            console.log(`   📊 Is Array: ${isArray}`);
            console.log(`   🔍 Has data property: ${hasData}`);
            
            if (hasData && Array.isArray(data.data)) {
              console.log(`   📋 data.data is array with ${data.data.length} items`);
              console.log(`   ✨ Format: Wrapped (Vercel-style)`);
            } else if (isArray) {
              console.log(`   📋 Direct array with ${data.length} items`);
              console.log(`   ✨ Format: Direct array (Replit-style)`);
            } else {
              console.log(`   ⚠️  Other format - object`);
            }
          } catch (jsonError) {
            console.log(`   ❌ JSON parsing error: ${jsonError.message}`);
          }
        } else {
          console.log(`   ✅ HTML/Other Response - likely homepage`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   💥 Request failed: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎯 Local test completed!');
  console.log('If APIs return direct arrays here, our fix will work for Vercel wrapped format.');
}

testLocalAPI().catch(console.error);