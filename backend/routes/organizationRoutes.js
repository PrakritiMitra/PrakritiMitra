// backend/routes/organizationRoutes.js

const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const orgCtrl = require('../controllers/organizationController');

// Register a new organization (organizer creates it)
router.post('/register', protect, orgCtrl.registerOrganization);

// Get the organization created by the current user
router.get('/my', protect, orgCtrl.getMyOrganization);

// Get all organizations the current user is approved in
router.get('/approved', protect, orgCtrl.getApprovedOrganizations);

// Get all join requests made by current user
router.get('/my-requests', protect, orgCtrl.getMyRequests);

// Request to join an organization
router.post('/:id/join', protect, orgCtrl.joinOrganization);

// Approve a user to an organization team (only for admins)
router.patch('/:orgId/approve/:userId', protect, orgCtrl.approveTeamMember);

router.delete('/:orgId/reject/:userId', protect, orgCtrl.rejectTeamMember);

// Get team members of an organization
router.get('/:id/team', protect, orgCtrl.getOrganizationTeam);

// Get all organizations (basic listing)
router.get('/', orgCtrl.getAllOrganizations);

// Get organization by ID (excluding team)
// IMPORTANT: keep this as the last route to prevent conflicts
router.get('/:id', orgCtrl.getOrganizationById);

// @route   GET /api/organizations/user/:userId
router.get('/user/:userId', orgCtrl.getOrganizationsByUserId);

module.exports = router;
