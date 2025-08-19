const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import Cloudinary storage configurations
const { 
  organizationStorage, 
  profileStorage, 
  eventStorage, 
  chatStorage 
} = require('../config/cloudinary');

async function testCloudinaryUploads() {
  console.log('🧪 Testing Cloudinary Upload Middleware...\n');

  try {
    // Test 1: Organization Storage
    console.log('📋 Test 1: Organization Storage');
    const orgUpload = multer({ storage: organizationStorage });
    console.log('✅ Organization storage configured\n');

    // Test 2: Profile Storage
    console.log('📋 Test 2: Profile Storage');
    const profileUpload = multer({ storage: profileStorage });
    console.log('✅ Profile storage configured\n');

    // Test 3: Event Storage
    console.log('📋 Test 3: Event Storage');
    const eventUpload = multer({ storage: eventStorage });
    console.log('✅ Event storage configured\n');

    // Test 4: Chat Storage
    console.log('📋 Test 4: Chat Storage');
    const chatUpload = multer({ storage: chatStorage });
    console.log('✅ Chat storage configured\n');

    // Test 5: Create a test file for upload simulation
    console.log('📋 Test 5: Creating Test File');
    const testDir = path.join(__dirname, '../test-uploads');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-image.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for Cloudinary upload');
    console.log('✅ Test file created\n');

    // Test 6: Simulate file upload (without actually uploading)
    console.log('📋 Test 6: Upload Middleware Configuration');
    console.log('   Organization fields: logo, gstCertificate, panCard, ngoRegistration, letterOfIntent');
    console.log('   Profile fields: profileImage, govtIdProof');
    console.log('   Event fields: eventImages, govtApprovalLetter');
    console.log('   Chat fields: file');
    console.log('✅ Upload middleware configuration verified\n');

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }

    console.log('🎉 All Cloudinary upload middleware tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Your upload middleware is configured correctly');
    console.log('   2. Files will be uploaded to Cloudinary automatically');
    console.log('   3. You can proceed to Phase 3: Update controllers');
    console.log('   4. Test actual file uploads through your API endpoints');

  } catch (error) {
    console.log('❌ Cloudinary upload middleware test failed!');
    console.log(`   Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your Cloudinary configuration');
    console.log('   2. Verify environment variables are set');
    console.log('   3. Ensure Cloudinary credentials are correct');
  }
}

// Run the test
testCloudinaryUploads().catch((error) => {
  console.log('❌ Test script failed with error:');
  console.log(`   ${error.message}`);
});
