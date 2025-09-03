// test_local_endpoints.js - فحص نقاط النهاية المحلية
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

const endpoints = [
  { name: "projects", url: `${BASE_URL}/api/projects` },
  { name: "projects-with-stats", url: `${BASE_URL}/api/projects/with-stats` },
  { name: "worker-types", url: `${BASE_URL}/api/worker-types` },
  { name: "workers", url: `${BASE_URL}/api/workers` }
];

async function testLocalEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing LOCAL endpoint: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    
    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`   ❌ HTTP Error: ${response.status}`);
      return {
        endpoint: endpoint.name,
        status: response.status,
        success: false,
        error: `HTTP ${response.status}`,
        dataType: 'unknown'
      };
    }

    const data = await response.json();
    const isArray = Array.isArray(data);
    const hasDataProperty = data && data.data !== undefined;
    const isDataArray = hasDataProperty && Array.isArray(data.data);
    
    console.log(`   ✅ Response received`);
    console.log(`   📊 Data type: ${typeof data}`);
    console.log(`   📋 Is direct array: ${isArray}`);
    console.log(`   🔍 Has data property: ${hasDataProperty}`);
    
    if (hasDataProperty) {
      console.log(`   📋 data.data is array: ${isDataArray}`);
      console.log(`   📊 data.data length: ${isDataArray ? data.data.length : 'N/A'}`);
      console.log(`   ✨ Format: Wrapped format { success, data, count }`);
    } else if (isArray) {
      console.log(`   📊 Array length: ${data.length}`);
      console.log(`   ✨ Format: Direct array format`);
    } else {
      console.log(`   ⚠️  Unexpected format`);
      console.log(`   🔍 Sample data:`, JSON.stringify(data).slice(0, 100));
    }

    return {
      endpoint: endpoint.name,
      status: response.status,
      success: true,
      isArray,
      hasDataProperty,
      isDataArray: isDataArray || false,
      itemCount: hasDataProperty ? (isDataArray ? data.data.length : 'invalid') : (isArray ? data.length : 'object'),
      format: hasDataProperty ? 'wrapped' : (isArray ? 'direct' : 'object'),
      sampleData: isArray ? data.slice(0,1) : (hasDataProperty && isDataArray ? data.data.slice(0,1) : data)
    };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      endpoint: endpoint.name,
      status: 'error',
      success: false,
      error: error.message,
      dataType: 'unknown'
    };
  }
}

async function runLocalTests() {
  console.log('🏠 Starting LOCAL API endpoints check...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testLocalEndpoint(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📋 LOCAL SUMMARY REPORT');
  console.log('=======================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const format = result.format || 'unknown';
    const count = result.itemCount !== undefined ? result.itemCount : '?';
    
    console.log(`${status} ${result.endpoint}: ${format} format, ${count} items`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 LOCAL Overall: ${successCount}/${results.length} endpoints working`);
  
  // Analyze for the specific fix we implemented
  const workingEndpoints = results.filter(r => r.success);
  if (workingEndpoints.length > 0) {
    console.log('\n🔧 DATA FORMAT ANALYSIS:');
    workingEndpoints.forEach(result => {
      console.log(`   ${result.endpoint}: ${result.format} format`);
      if (result.format === 'direct' && result.itemCount > 0) {
        console.log(`      ✅ Direct array - our Array.isArray() check will work`);
      } else if (result.format === 'wrapped' && result.isDataArray) {
        console.log(`      ✅ Wrapped format - our data.data extraction will work`);
      } else {
        console.log(`      ⚠️  May need additional handling`);
      }
    });
  }

  return results;
}

// Run the checks
runLocalTests()
  .then(results => {
    console.log('\n🏁 Local check completed successfully');
    console.log('🚀 If local endpoints work with direct arrays, our fix should solve Vercel issue!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error during local checks:', error);
    process.exit(1);
  });