// check_endpoints.js
// Usage: node check_endpoints.js
// Ensure you set AUTH_HEADER (optional) in env: export AUTH_HEADER="Bearer <token>"

const fetch = global.fetch || require('node-fetch');

const endpoints = [
  // عدّل هذه المسارات بحسب تطبيقك
  { 
    name: "projects", 
    url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/projects` : "https://construction-management-f59i6dkox-mr-199.vercel.app/api/projects"
  },
  { 
    name: "projects-with-stats", 
    url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/projects/with-stats` : "https://construction-management-f59i6dkox-mr-199.vercel.app/api/projects/with-stats"
  },
  { 
    name: "worker-types", 
    url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/worker-types` : "https://construction-management-f59i6dkox-mr-199.vercel.app/api/worker-types"
  },
  { 
    name: "workers", 
    url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/workers` : "https://construction-management-f59i6dkox-mr-199.vercel.app/api/workers"
  }
];

async function checkEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing endpoint: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // إضافة رأس المصادقة إذا كان متوفراً
    if (process.env.AUTH_HEADER) {
      headers.Authorization = process.env.AUTH_HEADER;
    }

    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers,
      timeout: 15000 // 15 second timeout
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`   ❌ HTTP Error: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error details: ${errorText.slice(0, 200)}...`);
      return {
        endpoint: endpoint.name,
        status: response.status,
        success: false,
        error: `HTTP ${response.status}`,
        dataType: 'unknown'
      };
    }

    const data = await response.json();
    const dataType = typeof data;
    const isArray = Array.isArray(data);
    const hasDataProperty = data && data.data !== undefined;
    const isDataArray = hasDataProperty && Array.isArray(data.data);
    
    console.log(`   ✅ Response received`);
    console.log(`   📊 Data type: ${dataType}`);
    console.log(`   📋 Is array: ${isArray}`);
    console.log(`   🔍 Has data property: ${hasDataProperty}`);
    
    if (hasDataProperty) {
      console.log(`   📋 data.data is array: ${isDataArray}`);
      console.log(`   📊 data.data length: ${isDataArray ? data.data.length : 'N/A'}`);
      console.log(`   ✨ Format: Vercel API format { success, data, count }`);
    } else if (isArray) {
      console.log(`   📊 Array length: ${data.length}`);
      console.log(`   ✨ Format: Direct array format`);
    } else {
      console.log(`   ⚠️  Unexpected format - neither array nor {data: array}`);
    }

    return {
      endpoint: endpoint.name,
      status: response.status,
      success: true,
      dataType,
      isArray,
      hasDataProperty,
      isDataArray: isDataArray || false,
      itemCount: hasDataProperty ? (isDataArray ? data.data.length : 'invalid') : (isArray ? data.length : 'invalid'),
      format: hasDataProperty ? 'vercel' : (isArray ? 'direct' : 'unknown')
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

async function runAllChecks() {
  console.log('🚀 Starting API endpoints check...');
  console.log(`🌐 Base URL: ${process.env.API_BASE_URL || 'https://construction-management-f59i6dkox-mr-199.vercel.app'}`);
  console.log(`🔑 Auth header: ${process.env.AUTH_HEADER ? 'Present' : 'Not set'}`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📋 SUMMARY REPORT');
  console.log('================');
  
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
  console.log(`\n🎯 Overall: ${successCount}/${results.length} endpoints working`);
  
  // Check for the specific issue that was causing problems
  const vercelFormatEndpoints = results.filter(r => r.format === 'vercel');
  const directFormatEndpoints = results.filter(r => r.format === 'direct');
  
  if (vercelFormatEndpoints.length > 0 && directFormatEndpoints.length > 0) {
    console.log('\n⚠️  WARNING: Mixed response formats detected!');
    console.log('   Some endpoints return Vercel format {data: [...]}, others return direct arrays');
    console.log('   This could cause the w.find() errors in production!');
  } else if (vercelFormatEndpoints.length > 0) {
    console.log('\n✅ All endpoints use Vercel format - this should work with the fix');
  } else if (directFormatEndpoints.length > 0) {
    console.log('\n✅ All endpoints use direct array format - this should work too');
  }

  return results;
}

// Run the checks
runAllChecks()
  .then(results => {
    console.log('\n🏁 Check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error during checks:', error);
    process.exit(1);
  });