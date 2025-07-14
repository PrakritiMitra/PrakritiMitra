const mongoose = require('mongoose');
const Organization = require('../models/organization');
const User = require('../models/user');

// Register new organization
exports.registerOrganization = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, website, category, verifiedStatus } = req.body;

    console.log("🔹 Registering organization:", { name, userId });

    const organization = await Organization.create({
      name,
      description,
      website,
      category,
      verifiedStatus,
      createdBy: userId,
      team: [{
        userId,
        status: 'approved'
      }],
    });

    console.log("✅ Organization registered:", organization._id);
    res.status(201).json(organization);
  } catch (err) {
    console.error("❌ Failed to register organization:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get organization created by current user
exports.getMyOrganization = async (req, res) => {
  try {
    console.log("🔹 Fetching org for user:", req.user._id);
    const org = await Organization.findOne({
      $or: [
        { createdBy: req.user._id },
        { "team.userId": req.user._id }
      ]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    console.log("✅ Organization found:", org._id);
    res.json(org);
  } catch (err) {
    console.error("❌ Server error in getMyOrganization:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Request to join organization
exports.joinOrganization = async (req, res) => {
  try {
    console.log(`🔹 ${req.user._id} requesting to join org: ${req.params.id}`);
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const alreadyRequested = org.team.some(member =>
      member.userId.toString() === req.user._id.toString()
    );
    if (alreadyRequested) {
      console.log("⚠️ Already requested or member");
      return res.status(400).json({ message: 'Already requested or a member' });
    }

    org.team.push({ userId: req.user._id, status: 'pending' });
    await org.save();

    console.log("✅ Join request sent");
    res.json({ message: 'Join request sent' });
  } catch (err) {
    console.error("❌ Failed to send join request:", err);
    res.status(500).json({ message: 'Failed to send request', error: err });
  }
};

// Approve member
exports.approveTeamMember = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    console.log(`🔹 Approving user ${userId} for org ${orgId}`);

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      console.log("⛔ Not authorized to approve");
      return res.status(403).json({ message: 'Only admins can approve' });
    }

    const member = org.team.find(m => m.userId.equals(userId));
    if (!member) return res.status(404).json({ message: 'User not found in team' });

    member.status = 'approved';
    await org.save();

    console.log("✅ User approved successfully");
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error("❌ Approval failed:", err);
    res.status(500).json({ message: 'Approval failed', error: err });
  }
};

// Get all organizations NOT already joined by current user
exports.getAllOrganizations = async (req, res) => {
  try {
    console.log("🔹 Fetching all organizations");

    const userId = req.user?._id;
    if (userId) {
      console.log("🔹 Called by user:", userId);
    }

    const orgs = await Organization.find({}, "name description logoUrl");
    console.log(`✅ ${orgs.length} organizations fetched`);

    res.json(orgs);
  } catch (err) {
    console.error("❌ Failed to fetch organizations:", err);
    res.status(500).json({
      message: "Failed to fetch organizations",
      error: err.message,
    });
  }
};

// Get org by ID (excluding team)
exports.getOrganizationById = async (req, res) => {
  const orgId = req.params.id;
  console.log("🔹 Fetching org by ID:", orgId);

  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  try {
    const org = await Organization.findById(orgId).select("-team");
    if (!org) return res.status(404).json({ message: "Organization not found" });

    console.log("✅ Org found:", org._id);
    res.json(org);
  } catch (err) {
    console.error("❌ Failed to fetch org by ID:", err);
    res.status(500).json({ message: "Failed to fetch organization", error: err });
  }
};

// Get team members of an org
exports.getOrganizationTeam = async (req, res) => {
  try {
    const orgId = req.params.id;
    console.log("🔹 Fetching team for org:", orgId);
    const org = await Organization.findById(orgId).populate('team.userId', 'name email');
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    console.log(`✅ Team of ${org.team.length} members fetched`);
    res.json(org.team);
  } catch (err) {
    console.error("❌ Failed to fetch team:", err);
    res.status(500).json({ message: 'Failed to fetch team', error: err });
  }
};

// Get all approved organizations
exports.getApprovedOrganizations = async (req, res) => {
  try {
    console.log("🔹 Fetching approved orgs for user:", req.user._id);

    const orgs = await Organization.find({
      $or: [
        { createdBy: req.user._id },
        {
          team: {
            $elemMatch: {
              userId: req.user._id,
              status: 'approved'
            }
          }
        }
      ]
    }).select('name _id description');

    console.log(`✅ ${orgs.length} approved/created orgs found`);
    res.json(orgs);
  } catch (err) {
    console.error("❌ Failed to fetch approved orgs:", err);
    res.status(500).json({ message: 'Failed to fetch organizations', error: err });
  }
};

// Get all requests (approved + pending)
exports.getMyRequests = async (req, res) => {
  try {
    console.log("🔹 Fetching requests for:", req.user._id);

    const orgs = await Organization.find({
      'team.userId': req.user._id
    }).select('name _id team');

    const approved = [];
    const pending = [];

    orgs.forEach(org => {
      const member = org.team.find(m => m.userId.equals(req.user._id));
      if (member?.status === 'approved') approved.push(org);
      else if (member?.status === 'pending') pending.push(org);
    });

    console.log(`✅ ${approved.length} approved, ${pending.length} pending`);
    res.json({ approved, pending });
  } catch (err) {
    console.error("❌ Failed to fetch my requests:", err);
    res.status(500).json({ message: 'Failed to fetch requests', error: err });
  }
};

// Reject a pending team member
exports.rejectTeamMember = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    console.log(`🔹 Rejecting user ${userId} for org ${orgId}`);

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can reject requests' });
    }

    const memberIndex = org.team.findIndex(m => m.userId.equals(userId));
    if (memberIndex === -1) return res.status(404).json({ message: 'User not in team' });

    org.team.splice(memberIndex, 1); // remove the request
    await org.save();

    console.log("✅ User rejected successfully");
    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error("❌ Rejection failed:", err);
    res.status(500).json({ message: 'Rejection failed', error: err });
  }
};
