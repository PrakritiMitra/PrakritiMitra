const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
require('dotenv').config();

const fixOAuthPasswords = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find OAuth users with unencrypted passwords (passwords that don't start with $2b$)
    const oauthUsers = await User.find({
      oauthProvider: { $exists: true, $ne: null },
      password: { $exists: true, $ne: null },
      $expr: {
        $not: {
          $regexMatch: {
            input: "$password",
            regex: "^\\$2b\\$"
          }
        }
      }
    });

    console.log(`🔍 Found ${oauthUsers.length} OAuth users with unencrypted passwords`);

    if (oauthUsers.length === 0) {
      console.log('✅ No users need password fixing');
      return;
    }

    // Hash each unencrypted password
    for (const user of oauthUsers) {
      console.log(`🔧 Fixing password for user: ${user.email}`);
      
      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;
      await user.save();
      
      console.log(`✅ Fixed password for: ${user.email}`);
    }

    console.log('✅ All OAuth user passwords have been fixed!');

  } catch (error) {
    console.error('❌ Error fixing OAuth passwords:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the script
fixOAuthPasswords();
