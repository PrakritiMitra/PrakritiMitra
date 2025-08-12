warning: in the working copy of 'backend/controllers/authController.js', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/backend/controllers/authController.js b/backend/controllers/authController.js[m
[1mindex 0118055..c61fff8 100644[m
[1m--- a/backend/controllers/authController.js[m
[1m+++ b/backend/controllers/authController.js[m
[36m@@ -29,14 +29,26 @@[m [mexports.signupVolunteer = async (req, res) => {[m
       return res.status(400).json({ message: "Passwords do not match" });[m
     }[m
 [m
[31m-    // Check if email already exists[m
[31m-    const existingEmail = await User.findOne({ email });[m
[32m+[m[32m    // Check if email already exists in active accounts[m
[32m+[m[32m    const existingEmail = await User.findOne({[m
[32m+[m[32m      email,[m
[32m+[m[32m      $or: [[m
[32m+[m[32m        { isDeleted: { $exists: false } },[m
[32m+[m[32m        { isDeleted: false }[m
[32m+[m[32m      ][m
[32m+[m[32m    });[m
     if (existingEmail) {[m
       return res.status(400).json({ message: "Email already exists" });[m
     }[m
 [m
[31m-    // Check if username already exists[m
[31m-    const existingUsername = await User.findOne({ username: username.toLowerCase() });[m
[32m+[m[32m    // Check if username already exists in active accounts[m
[32m+[m[32m    const existingUsername = await User.findOne({[m
[32m+[m[32m      username: username.toLowerCase(),[m
[32m+[m[32m      $or: [[m
[32m+[m[32m        { isDeleted: { $exists: false } },[m
[32m+[m[32m        { isDeleted: false }[m
[32m+[m[32m      ][m
[32m+[m[32m    });[m
     if (existingUsername) {[m
       return res.status(400).json({ message: "Username already exists" });[m
     }[m
[36m@@ -66,12 +78,6 @@[m [mexports.signupVolunteer = async (req, res) => {[m
       oauthId: undefined[m
     };[m
 [m
[31m-    console.log('🔧 Creating new user with data:', {[m
[31m-      ...userData,[m
[31m-      password: '***hashed***',[m
[31m-      dateOfBirth: userData.dateOfBirth.toISOString()[m
[31m-    });[m
[31m-[m
     const user = new User(userData);[m
 [m
     const profileImage = req.files?.profileImage?.[0]?.filename || null;[m
[36m@@ -107,10 +113,14 @@[m [mexports.signupOrganizer = async (req, res) => {[m
       return res.status(400).json({ message: "Passwords do not match" });[m
     }[m
 [m
[31m-    // Check if email already exists[m
[31m-    console.log('🔍 Checking if email exists:', email);[m
[31m-    const existingEmail = await User.findOne({ email });[m
[31m-    console.log('🔎 Email check result:', existingEmail ? 'Exists' : 'Not found');[m
[32m+[m[32m    // Check if email already exists in active accounts[m
[32m+[m[32m    const existingEmail = await User.findOne({[m
[32m+[m[32m      email,[m
[32m+[m[32m      $or: [[m
[32m+[m[32m        { isDeleted: { $exists: false } },[m
[32m+[m[32m        { isDeleted: false }[m
[32m+[m[32m      ][m
[32m+[m[32m    });[m
     [m
     if (existingEmail) {[m
       console.warn(`⚠️ Email already exists: ${email}`, {[m
[36m@@ -130,8 +140,14 @@[m [mexports.signupOrganizer = async (req, res) => {[m
       });[m
     }[m
 [m
[31m-    // Check if username already exists[m
[31m-    const existingUsername = await User.findOne({ username: username.toLowerCase() });[m
[32m+[m[32m    // Check if username already exists in active accounts[m
[32m+[m[32m    const existingUsername = await User.findOne({[m
[32m+[m[32m      username: username.toLowerCase(),[m
[32m+[m[32m      $or: [[m
[32m+[m[32m        { isDeleted: { $exists: false } },[m
[32m+[m[32m        { isDeleted: false }[m
[32m+[m[32m      ][m
[32m+[m[32m    });[m
     if (existingUsername) {[m
       return res.status(400).json({ message: "Username already exists" });[m
     }[m
[36m@@ -161,12 +177,6 @@[m [mexports.signupOrganizer = async (req, res) => {[m
       oauthId: undefined[m
     };[m
 [m
[31m-    console.log('🔧 Creating new organizer with data:', {[m
[31m-      ...userData,[m
[31m-      password: '***hashed***',[m
[31m-      dateOfBirth: userData.dateOfBirth.toISOString()[m
[31m-    });[m
[31m-[m
     // Create and save the organizer[m
     const user = new User(userData);[m
     user.oauthProvider = undefined;[m
[36m@@ -298,8 +308,6 @@[m [mexports.setPassword = async (req, res) => {[m
     user.password = hashedPassword;[m
     await user.save();[m
 [m
[31m-    console.log("✅ Password set successfully for OAuth user:", user.email);[m
[31m-[m
     res.status(200).json({ [m
       message: "Password set successfully. You can now login with email and password.",[m
       user: {[m
