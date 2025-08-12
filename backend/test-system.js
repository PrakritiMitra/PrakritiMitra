const mongoose = require('mongoose');
const User = require('./models/user');
const Registration = require('./models/registration');
const Event = require('./models/event');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/prakritimitra', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testSystem() {
  try {
    await mongoose.connection.asPromise();
    console.log('🧪 Testing Account Deletion & Recovery System\n');
    
    // Check current database state
    const totalUsers = await User.countDocuments();
    const deletedUsers = await User.countDocuments({ isDeleted: true });
    const activeUsers = await User.countDocuments({ isDeleted: false });
    
    console.log('📊 Database Status:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Deleted Users: ${deletedUsers}`);
    
    if (totalUsers === 0) {
      console.log('\n💡 Database is empty. To test the system:');
      console.log('   1. Start the backend server: npm start');
      console.log('   2. Start the frontend: cd ../frontend && npm run dev');
      console.log('   3. Create a new account through the UI');
      console.log('   4. Create some data (register for events, etc.)');
      console.log('   5. Test account deletion from Profile page');
      console.log('   6. Test account recovery from login page');
      return;
    }
    
    // Show sample users
    const users = await User.find().limit(5);
    console.log('\n👥 Sample Users:');
    users.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.username} (${user.email}) - Role: ${user.role} - Deleted: ${user.isDeleted}`);
      console.log(`      OAuth: ${user.oauthProvider || 'none'} | Has Password: ${!!user.password}`);
    });
    
    // Check for the specific recovered user
    const recoveredUser = await User.findOne({ email: 'pathaneamrut2@gmail.com' });
    if (recoveredUser) {
      console.log('\n🔍 Recovered User Details:');
      console.log(`   Username: ${recoveredUser.username}`);
      console.log(`   Email: ${recoveredUser.email}`);
      console.log(`   Role: ${recoveredUser.role}`);
      console.log(`   Is Deleted: ${recoveredUser.isDeleted}`);
      console.log(`   OAuth Provider: ${recoveredUser.oauthProvider || 'none'}`);
      console.log(`   Has Password: ${!!recoveredUser.password}`);
      console.log(`   Has OAuth ID: ${!!recoveredUser.oauthId}`);
      console.log(`   Deletion ID: ${recoveredUser.deletionId || 'none'}`);
      console.log(`   Deletion Sequence: ${recoveredUser.deletionSequence || 'none'}`);
    }
    
    // Check for any data
    const totalEvents = await Event.countDocuments();
    const totalRegistrations = await Registration.countDocuments();
    
    console.log('\n📊 Data Status:');
    console.log(`   Events: ${totalEvents}`);
    console.log(`   Registrations: ${totalRegistrations}`);
    
    console.log('\n✅ System is ready for testing!');
    console.log('\n🔧 To test account deletion:');
    console.log('   1. Go to Profile page in the frontend');
    console.log('   2. Click "Delete My Account"');
    console.log('   3. Type "delete my account" to confirm');
    console.log('   4. Verify account is deleted but data remains');
    
    console.log('\n🔧 To test account recovery:');
    console.log('   1. Go to login page');
    console.log('   2. Click "Recover deleted account?"');
    console.log('   3. Enter your email');
    console.log('   4. Check email for recovery link');
    console.log('   5. Click link to restore account');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testSystem();
