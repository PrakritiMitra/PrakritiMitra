const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { profileSingleUpload, profileMultiUpload } = require('../middlewares/upload'); 
const { protect } = require('../middlewares/authMiddleware');

router.post('/signup-volunteer', profileSingleUpload, authController.signupVolunteer);
router.post('/signup-organizer', profileMultiUpload, authController.signupOrganizer);
router.post('/login', authController.login);
router.post('/set-password', authController.setPassword);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

// Test endpoint to check reset token state (for debugging)
router.get('/check-reset-token/:token', authController.checkResetToken);

// Token management routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all-devices', protect, authController.logoutAllDevices);

module.exports = router;
