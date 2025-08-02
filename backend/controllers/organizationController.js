const mongoose = require('mongoose');
const Organization = require('../models/organization');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

// Register new organization
exports.registerOrganization = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      website,
      socialLinks,
      headOfficeLocation,
      orgEmail,
      visionMission,
      orgPhone,
      yearOfEstablishment,
      focusArea,
      focusAreaOther
    } = req.body;

    // Handle file uploads
    const files = req.files || {};
    const logo = files.logo ? files.logo[0].filename : undefined;
    const gstCertificate = files.gstCertificate ? files.gstCertificate[0].filename : undefined;
    const panCard = files.panCard ? files.panCard[0].filename : undefined;
    const ngoRegistration = files.ngoRegistration ? files.ngoRegistration[0].filename : undefined;
    const letterOfIntent = files.letterOfIntent ? files.letterOfIntent[0].filename : undefined;

    // Parse socialLinks if sent as JSON string
    let parsedSocialLinks = socialLinks;
    if (typeof socialLinks === 'string') {
      try {
        parsedSocialLinks = JSON.parse(socialLinks);
      } catch {
        parsedSocialLinks = [socialLinks];
      }
    }

    const organization = await Organization.create({
      name,
      description,
      website,
      socialLinks: parsedSocialLinks,
      logo,
      headOfficeLocation,
      orgEmail,
      visionMission,
      orgPhone,
      yearOfEstablishment,
      focusArea,
      focusAreaOther,
      documents: {
        gstCertificate,
        panCard,
        ngoRegistration,
        letterOfIntent,
      },
      createdBy: userId,
      team: [
        {
          userId,
          status: 'approved',
          isAdmin: true,
          position: 'Founder',
        },
      ],
    });

    res.status(201).json(organization);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return res.status(409).json({ message: 'An organization with this name already exists. Please choose a different name.' });
    }
    console.error("❌ Failed to register organization:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get organization created by current user
exports.getMyOrganization = async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [
        { createdBy: req.user._id },
        { "team.userId": req.user._id }
      ]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    res.json(org);
  } catch (err) {
    console.error("❌ Server error in getMyOrganization:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Request to join organization
exports.joinOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const existingMember = org.team.find(member => member.userId.toString() === req.user._id.toString());
    if (existingMember) {
      if (existingMember.status === 'pending') {
        return res.status(400).json({ message: 'Already requested or a member' });
      } else if (existingMember.status === 'approved') {
        return res.status(400).json({ message: 'Already requested or a member' });
      } else if (existingMember.status === 'rejected') {
        // Allow reapply: set status back to pending
        existingMember.status = 'pending';
        await org.save();
        return res.json({ message: 'Join request sent' });
      }
    }

    org.team.push({ userId: req.user._id, status: 'pending' });
    await org.save();

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

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can approve' });
    }

    const member = org.team.find(m => m.userId.equals(userId));
    if (!member) return res.status(404).json({ message: 'User not found in team' });

    member.status = 'approved';
    await org.save();

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error("❌ Approval failed:", err);
    res.status(500).json({ message: 'Approval failed', error: err });
  }
};

// Get all organizations NOT already joined by current user
exports.getAllOrganizations = async (req, res) => {
  try {

    const userId = req.user?._id;
    if (userId) {
    }

    const orgs = await Organization.find({}, "name description logoUrl");

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

  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  try {
    const org = await Organization.findById(orgId).select("-team");
    if (!org) return res.status(404).json({ message: "Organization not found" });

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
    // Populate name, email, role, profileImage, and govtIdProofUrl for each user
    const org = await Organization.findById(orgId).populate('team.userId', 'name username email role profileImage govtIdProofUrl');
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    res.json(org.team);
  } catch (err) {
    console.error("❌ Failed to fetch team:", err);
    res.status(500).json({ message: 'Failed to fetch team', error: err });
  }
};

// Get all approved organizations
exports.getApprovedOrganizations = async (req, res) => {
  try {

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

    res.json(orgs);
  } catch (err) {
    console.error("❌ Failed to fetch approved orgs:", err);
    res.status(500).json({ message: 'Failed to fetch organizations', error: err });
  }
};

// Get all requests (approved + pending)
exports.getMyRequests = async (req, res) => {
  try {

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

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can reject requests' });
    }

    const member = org.team.find(m => m.userId.equals(userId));
    if (!member) return res.status(404).json({ message: 'User not in team' });

    if (member.status === 'rejected') {
      // If already rejected, remove from team
      org.team = org.team.filter(m => !m.userId.equals(userId));
      await org.save();
      return res.json({ message: 'User removed from team (already rejected)' });
    }

    member.status = 'rejected';
    await org.save();

    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error("❌ Rejection failed:", err);
    res.status(500).json({ message: 'Rejection failed', error: err });
  }
};

// Withdraw join request
exports.withdrawJoinRequest = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    // Find the member entry
    const memberIdx = org.team.findIndex(member => member.userId.toString() === req.user._id.toString() && member.status === 'pending');
    if (memberIdx === -1) {
      return res.status(400).json({ message: 'No pending join request found for this user.' });
    }
    org.team.splice(memberIdx, 1);
    await org.save();
    res.json({ message: 'Join request withdrawn' });
  } catch (err) {
    console.error('❌ Failed to withdraw join request:', err);
    res.status(500).json({ message: 'Failed to withdraw join request', error: err });
  }
};

// Get all organizations for a given userId (public)
exports.getOrganizationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    // Find orgs where user is in team (approved or pending)
    const orgs = await Organization.find({
      'team.userId': userId
    }).select('name _id description');
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch organizations', error: err });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    const updateData = req.body;


    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user is authorized to update (creator or admin)
    const userId = req.user._id.toString();
    const isCreator = org.createdBy.toString() === userId;
    const isAdmin = org.team.some(m => m.userId.toString() === userId && m.isAdmin);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to update this organization' });
    }

    // Update the organization
    // Use $set for nested objects to ensure proper updating
    const updateQuery = {};
    
    // Handle basic fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'sponsorship') {
        updateQuery[key] = updateData[key];
      }
    });
    
    // Handle sponsorship object separately with $set
    if (updateData.sponsorship) {
      Object.keys(updateData.sponsorship).forEach(key => {
        updateQuery[`sponsorship.${key}`] = updateData.sponsorship[key];
      });
    }
    
    
    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      updateQuery,
      { new: true, runValidators: true }
    );


    res.json(updatedOrg);
  } catch (err) {
    console.error('❌ Failed to update organization:', err);
    res.status(500).json({ message: 'Server error while updating organization' });
  }
};

// Delete organization
exports.deleteOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user is authorized to delete (creator or admin)
    const userId = req.user._id.toString();
    const isCreator = org.createdBy.toString() === userId;
    const isAdmin = org.team.some(m => m.userId.toString() === userId && m.isAdmin);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this organization' });
    }

    // ✅ Delete associated files before deleting the organization
    try {
      // Delete logo
      if (org.logo) {
        const logoPath = path.join(__dirname, "../uploads/OrganizationDetails", org.logo);
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }

      // Delete documents
      if (org.documents) {
        const documents = [
          org.documents.gstCertificate,
          org.documents.panCard,
          org.documents.ngoRegistration,
          org.documents.letterOfIntent
        ];

        documents.forEach(doc => {
          if (doc) {
            const docPath = path.join(__dirname, "../uploads/OrganizationDetails", doc);
            if (fs.existsSync(docPath)) {
              fs.unlinkSync(docPath);
            }
          }
        });
      }
    } catch (fileError) {
      console.error('⚠️ Error deleting files:', fileError);
      // Continue with organization deletion even if file deletion fails
    }

    // ✅ Delete the organization from database
    await Organization.findByIdAndDelete(orgId);

    return res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete organization:', err);
    res.status(500).json({ message: 'Server error while deleting organization' });
  }
};
