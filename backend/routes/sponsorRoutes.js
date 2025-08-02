const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { multiUpload } = require('../middlewares/upload');
const sponsorController = require('../controllers/sponsorController');

// Public routes (for browsing sponsors)
router.get('/', sponsorController.getAllSponsors);
router.get('/search', sponsorController.searchSponsors);
router.get('/:userId', sponsorController.getSponsorByUserId);

// Protected routes (require authentication)
router.use(protect);

// Sponsor profile management
router.post('/', multiUpload, sponsorController.createSponsor);
router.get('/profile/me', sponsorController.getSponsorByUserId);
router.put('/:id', multiUpload, sponsorController.updateSponsor);
router.delete('/:id', sponsorController.deleteSponsor);

// Sponsor statistics
router.get('/stats/me', sponsorController.getSponsorStats);

// Admin routes (for organization admins)
router.patch('/:sponsorId/verify', sponsorController.verifySponsor);

// Utility routes (for debugging and cleanup)
router.get('/debug/check-duplicates', sponsorController.checkDuplicateSponsors);

module.exports = router; 