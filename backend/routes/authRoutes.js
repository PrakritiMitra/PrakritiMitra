const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup-volunteer', authController.signupVolunteer);
router.post('/signup-organizer', authController.signupOrganizer);
router.post('/login', authController.login);

module.exports = router;
