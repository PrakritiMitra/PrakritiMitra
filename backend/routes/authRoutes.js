const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { profileSingleUpload, profileMultiUpload } = require('../middlewares/upload'); 

router.post('/signup-volunteer', profileSingleUpload, authController.signupVolunteer);
router.post('/signup-organizer', profileMultiUpload, authController.signupOrganizer);
router.post('/login', authController.login);
router.post('/set-password', authController.setPassword);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
