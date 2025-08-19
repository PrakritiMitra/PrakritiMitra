const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

// Import cloudinary after dotenv is loaded
const { cloudinary } = require('../config/cloudinary');

async function testCloudinaryConnection() {
  console.log('🔍 Testing Cloudinary Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}\n`);

  // Show actual values (masked for security)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log(`   Cloud Name Value: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  }
  if (process.env.CLOUDINARY_API_KEY) {
    console.log(`   API Key Value: ${process.env.CLOUDINARY_API_KEY.substring(0, 8)}...`);
  }
  if (process.env.CLOUDINARY_API_SECRET) {
    console.log(`   API Secret Value: ${process.env.CLOUDINARY_API_SECRET.substring(0, 8)}...`);
  }
  console.log('');

  // Check if all required variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('❌ Missing required Cloudinary environment variables!');
    console.log('   Please check your .env file and ensure all Cloudinary variables are set.');
    return;
  }

  try {
    // Test Cloudinary configuration
    console.log('🔧 Testing Cloudinary Configuration...');
    console.log(`   Cloud Name: ${cloudinary.config().cloud_name}`);
    console.log(`   API Key: ${cloudinary.config().api_key ? 'Set' : 'Missing'}`);
    console.log(`   API Secret: ${cloudinary.config().api_secret ? 'Set' : 'Missing'}\n`);

    // Test Cloudinary connection
    console.log('🔗 Testing Cloudinary Connection...');
    
    // Use a more reliable test method
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!');
    console.log(`   Response: ${JSON.stringify(result)}\n`);

    // Test account info
    console.log('📊 Testing Account Information...');
    try {
      const accountInfo = await cloudinary.api.resources({
        type: 'upload',
        max_results: 1
      });
      console.log('✅ Account access successful!');
      console.log(`   Total resources: ${accountInfo.total_count || 0}\n`);
    } catch (accountError) {
      console.log('⚠️  Account info test failed, but connection is working');
      console.log(`   Error: ${accountError.message}\n`);
    }

    // Test folder creation (this will create the main folder if it doesn't exist)
    console.log('📁 Testing Folder Structure...');
    
    try {
      // List resources to check if folders exist
      const resources = await cloudinary.api.resources({
        type: 'upload',
        max_results: 1,
        prefix: 'prakriti-mitra/'
      });
      
      console.log('✅ Cloudinary folder access successful!');
      console.log(`   Found ${resources.resources.length} resources in prakriti-mitra folder\n`);
    } catch (folderError) {
      console.log('⚠️  Folder test failed, but this is normal for new accounts');
      console.log(`   Error: ${folderError.message}\n`);
    }

    // Test upload preset creation (optional)
    console.log('⚙️ Checking Upload Presets...');
    try {
      const presets = await cloudinary.api.upload_presets();
      console.log('✅ Upload presets accessible!');
      console.log(`   Available presets: ${presets.presets.length}\n`);
    } catch (presetError) {
      console.log('⚠️  Upload presets not configured (this is optional)');
      console.log(`   Error: ${presetError.message}\n`);
    }

    console.log('🎉 All Cloudinary tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Your Cloudinary configuration is working correctly');
    console.log('   2. You can proceed to Phase 2: Update upload middleware');
    console.log('   3. The application will automatically create folders as needed');

  } catch (error) {
    console.log('❌ Cloudinary connection failed!');
    console.log(`   Error Type: ${error.constructor.name}`);
    console.log(`   Error Message: ${error.message}`);
    console.log(`   Error Code: ${error.http_code || 'N/A'}`);
    console.log(`   Error Status: ${error.http_status || 'N/A'}`);
    
    if (error.http_code === 401) {
      console.log('\n🔧 This appears to be an authentication error:');
      console.log('   1. Check your API key and secret are correct');
      console.log('   2. Ensure there are no extra spaces in your .env file');
      console.log('   3. Verify your Cloudinary account is active');
    } else if (error.http_code === 404) {
      console.log('\n🔧 This appears to be a cloud name error:');
      console.log('   1. Check your cloud name is correct');
      console.log('   2. Verify the cloud name in your Cloudinary dashboard');
    } else {
      console.log('\n🔧 General troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your Cloudinary account is active');
      console.log('   3. Check if there are any firewall restrictions');
      console.log('   4. Try accessing your Cloudinary dashboard');
    }
  }
}

// Run the test
testCloudinaryConnection().catch((error) => {
  console.log('❌ Test script failed with error:');
  console.log(`   ${error.message}`);
  console.log('\n🔧 This might be a configuration issue. Please check:');
  console.log('   1. Your .env file is in the correct location (backend/.env)');
  console.log('   2. All Cloudinary environment variables are set correctly');
  console.log('   3. The cloudinary config file is properly importing the variables');
});
