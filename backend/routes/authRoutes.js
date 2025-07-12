const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload'); 

router.post('/signup-volunteer', upload.single('profileImage'), authController.signupVolunteer);
router.post('/signup-organizer', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'govtIdProof', maxCount: 1 },
  ]),
  authController.signupOrganizer
);
router.post('/login', authController.login);

module.exports = router;
