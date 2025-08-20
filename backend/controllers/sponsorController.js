const Sponsor = require('../models/sponsor');
const User = require('../models/user');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');
const { updateSponsorStats } = require('../utils/sponsorUtils');

// Create a new sponsor profile
exports.createSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sponsorType,
      business,
      individual,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    } = req.body;

    // Check if user already has a sponsor profile
    const existingSponsor = await Sponsor.findOne({ user: userId });
    if (existingSponsor) {
      return res.status(400).json({ 
        message: 'You already have a sponsor profile' 
      });
    }

    // Handle file uploads to Cloudinary
    const files = req.files || {};
    let logoData, gstCertificateData, panCardData, companyRegistrationData;
    
    // Upload logo if provided
    if (files.logo && files.logo[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.logo[0], 'sponsors/logos');
        if (uploadResult.success) {
          logoData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ Logo uploaded successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ Logo upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading logo:', error);
      }
    }
    
    // Upload GST Certificate if provided
    if (files.gstCertificate && files.gstCertificate[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.gstCertificate[0], 'sponsors/documents');
        if (uploadResult.success) {
          gstCertificateData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ GST Certificate uploaded successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ GST Certificate upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading GST Certificate:', error);
      }
    }
    
    // Upload PAN Card if provided
    if (files.panCard && files.panCard[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.panCard[0], 'sponsors/documents');
        if (uploadResult.success) {
          panCardData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ PAN Card uploaded successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ PAN Card upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading PAN Card:', error);
      }
    }
    
    // Upload Company Registration if provided
    if (files.companyRegistration && files.companyRegistration[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.companyRegistration[0], 'sponsors/documents');
        if (uploadResult.success) {
          companyRegistrationData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ Company Registration uploaded successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ Company Registration upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading Company Registration:', error);
      }
    }

    // Create sponsor profile
    const sponsorData = {
      user: userId,
      sponsorType,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    };

    // Add business or individual details
    if (sponsorType === 'business') {
      sponsorData.business = {
        ...business,
        logo: logoData || null,
        documents: {
          gstCertificate: gstCertificateData || null,
          panCard: panCardData || null,
          companyRegistration: companyRegistrationData || null
        }
      };
    } else if (sponsorType === 'individual') {
      sponsorData.individual = individual;
    }

    const sponsor = await Sponsor.create(sponsorData);

    // Update user to mark as sponsor
    await User.findByIdAndUpdate(userId, {
      'sponsor.isSponsor': true,
      'sponsor.sponsorProfile': sponsor._id,
      'sponsor.upgradeApprovedAt': new Date()
    });

    res.status(201).json({
      message: 'Sponsor profile created successfully',
      sponsor
    });

  } catch (error) {
    console.error('Error creating sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to create sponsor profile',
      error: error.message 
    });
  }
};

// Get sponsor profile by user ID
exports.getSponsorByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    const sponsor = await Sponsor.findOne({ user: userId })
      .populate('user', 'name username email profileImage');

    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Auto-refresh stats before returning the profile
    try {
      await updateSponsorStats(sponsor._id);
    } catch (statsError) {
      console.error('❌ Error auto-refreshing stats:', statsError);
      // Don't fail the request if stats refresh fails
    }

    // Fetch the updated sponsor profile with fresh stats
    const updatedSponsor = await Sponsor.findOne({ user: userId })
      .populate('user', 'name username email profileImage');

    res.json(updatedSponsor);

  } catch (error) {
    console.error('Error fetching sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsor profile',
      error: error.message 
    });
  }
};

// Update sponsor profile
exports.updateSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    const sponsorId = req.params.id;
    

    
    const {
      business,
      individual,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    } = req.body;

    // Find sponsor and verify ownership
    const sponsor = await Sponsor.findOne({ _id: sponsorId, user: userId });
    
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Handle file uploads to Cloudinary
    const files = req.files || {};
    let logoData, gstCertificateData, panCardData, companyRegistrationData;
    
    // Upload logo if provided
    if (files.logo && files.logo[0]) {
      try {
        // Delete old logo from Cloudinary if it exists
        if (sponsor.business?.logo?.publicId) {
          await deleteFromCloudinary(sponsor.business.logo.publicId);
          console.log(`🗑️ Deleted old logo from Cloudinary: ${sponsor.business.logo.publicId}`);
        }
        
        const uploadResult = await uploadToCloudinary(files.logo[0], 'sponsors/logos');
        if (uploadResult.success) {
          logoData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ Logo updated successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ Logo upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading logo:', error);
      }
    }
    
    // Upload GST Certificate if provided
    if (files.gstCertificate && files.gstCertificate[0]) {
      try {
        // Delete old document from Cloudinary if it exists
        if (sponsor.business?.documents?.gstCertificate?.publicId) {
          await deleteFromCloudinary(sponsor.business.documents.gstCertificate.publicId);
          console.log(`🗑️ Deleted old GST Certificate from Cloudinary: ${sponsor.business.documents.gstCertificate.publicId}`);
        }
        
        const uploadResult = await uploadToCloudinary(files.gstCertificate[0], 'sponsors/documents');
        if (uploadResult.success) {
          gstCertificateData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ GST Certificate updated successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ GST Certificate upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading GST Certificate:', error);
      }
    }
    
    // Upload PAN Card if provided
    if (files.panCard && files.panCard[0]) {
      try {
        // Delete old document from Cloudinary if it exists
        if (sponsor.business?.documents?.panCard?.publicId) {
          await deleteFromCloudinary(sponsor.business.documents.panCard.publicId);
          console.log(`🗑️ Deleted old PAN Card from Cloudinary: ${sponsor.business.documents.panCard.publicId}`);
        }
        
        const uploadResult = await uploadToCloudinary(files.panCard[0], 'sponsors/documents');
        if (uploadResult.success) {
          panCardData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ PAN Card updated successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ PAN Card upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading PAN Card:', error);
      }
    }
    
    // Upload Company Registration if provided
    if (files.companyRegistration && files.companyRegistration[0]) {
      try {
        // Delete old document from Cloudinary if it exists
        if (sponsor.business?.documents?.companyRegistration?.publicId) {
          await deleteFromCloudinary(sponsor.business.documents.companyRegistration.publicId);
          console.log(`🗑️ Deleted old Company Registration from Cloudinary: ${sponsor.business.documents.companyRegistration.publicId}`);
        }
        
        const uploadResult = await uploadToCloudinary(files.companyRegistration[0], 'sponsors/documents');
        if (uploadResult.success) {
          companyRegistrationData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
          console.log(`✅ Company Registration updated successfully: ${uploadResult.publicId}`);
        } else {
          console.error('❌ Company Registration upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.error('❌ Error uploading Company Registration:', error);
      }
    }

    // Update sponsor data
    const updateData = {
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    };

    // Update business or individual details
    if (sponsor.sponsorType === 'business') {
      updateData.business = {
        ...business,
        ...(logoData && { logo: logoData }),
        documents: {
          ...sponsor.business?.documents,
          ...(gstCertificateData && { gstCertificate: gstCertificateData }),
          ...(panCardData && { panCard: panCardData }),
          ...(companyRegistrationData && { companyRegistration: companyRegistrationData })
        }
      };
    } else if (sponsor.sponsorType === 'individual') {
      updateData.individual = individual;
    }

    const updatedSponsor = await Sponsor.findByIdAndUpdate(
      sponsorId,
      updateData,
      { new: true }
    ).populate('user', 'name username email profileImage');

    // Update sponsor statistics to ensure they're current
    try {
      await updateSponsorStats(sponsorId);
    } catch (statsError) {
      console.error('Error updating sponsor stats after profile update:', statsError);
    }

    res.json({
      message: 'Sponsor profile updated successfully',
      sponsor: updatedSponsor
    });

  } catch (error) {
    console.error('Error updating sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to update sponsor profile',
      error: error.message 
    });
  }
};

// Delete sponsor profile
exports.deleteSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    const sponsorId = req.params.id;

    // Find sponsor and verify ownership
    const sponsor = await Sponsor.findOne({ _id: sponsorId, user: userId });
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Delete associated files from Cloudinary
    try {
      // Delete logo if it exists
      if (sponsor.business?.logo?.publicId) {
        await deleteFromCloudinary(sponsor.business.logo.publicId);
        console.log(`🗑️ Deleted logo from Cloudinary: ${sponsor.business.logo.publicId}`);
      }

      // Delete business documents if they exist
      if (sponsor.business?.documents) {
        const documents = sponsor.business.documents;
        for (const [docType, docData] of Object.entries(documents)) {
          if (docData && docData.publicId) {
            await deleteFromCloudinary(docData.publicId);
            console.log(`🗑️ Deleted ${docType} from Cloudinary: ${docData.publicId}`);
          }
        }
      }
    } catch (fileError) {
      console.error('⚠️ Error deleting files from Cloudinary:', fileError);
      // Continue with sponsor deletion even if file deletion fails
    }

    // Delete sponsor profile
    await Sponsor.findByIdAndDelete(sponsorId);

    // Update user to remove sponsor status
    await User.findByIdAndUpdate(userId, {
      'sponsor.isSponsor': false,
      'sponsor.sponsorProfile': null
    });

    res.json({ 
      message: 'Sponsor profile deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to delete sponsor profile',
      error: error.message 
    });
  }
};

// Get all sponsors (for admin/organization use)
exports.getAllSponsors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sponsorType, 
      focusArea,
      verified 
    } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (sponsorType) query.sponsorType = sponsorType;
    if (verified) query.verificationStatus = verified;
    if (focusArea) query['preferences.focusAreas'] = focusArea;

    const sponsors = await Sponsor.find(query)
      .populate('user', 'name username email profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsor.countDocuments(query);

    res.json({
      sponsors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsors',
      error: error.message 
    });
  }
};

// Verify sponsor (admin function)
exports.verifySponsor = async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const { verificationStatus, notes } = req.body;
    const adminId = req.user._id;

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor not found' 
      });
    }

    sponsor.verificationStatus = verificationStatus;
    sponsor.verifiedBy = adminId;
    sponsor.verifiedAt = new Date();

    if (notes) {
      sponsor.verificationNotes = notes;
    }

    await sponsor.save();

    res.json({
      message: 'Sponsor verification status updated',
      sponsor
    });

  } catch (error) {
    console.error('Error verifying sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to verify sponsor',
      error: error.message 
    });
  }
};

// Get sponsor statistics
exports.getSponsorStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const sponsor = await Sponsor.findOne({ user: userId });
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Get sponsorship statistics
    const Sponsorship = require('../models/sponsorship');
    const stats = await Sponsorship.aggregate([
      { $match: { sponsor: sponsor._id } },
      {
        $group: {
          _id: null,
          totalSponsorships: { $sum: 1 },
          totalValue: { $sum: '$contribution.value' },
          activeSponsorships: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          completedSponsorships: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const sponsorStats = stats[0] || {
      totalSponsorships: 0,
      totalValue: 0,
      activeSponsorships: 0,
      completedSponsorships: 0
    };

    res.json({
      sponsor,
      stats: sponsorStats
    });

  } catch (error) {
    console.error('Error fetching sponsor stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsor statistics',
      error: error.message 
    });
  }
};

// Search sponsors
exports.searchSponsors = async (req, res) => {
  try {
    const { 
      query, 
      focusArea, 
      sponsorType, 
      location,
      page = 1, 
      limit = 10 
    } = req.query;

    const searchQuery = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { 'business.name': { $regex: query, $options: 'i' } },
        { 'individual.profession': { $regex: query, $options: 'i' } },
        { contactPerson: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    // Apply filters
    if (focusArea) searchQuery['preferences.focusAreas'] = focusArea;
    if (sponsorType) searchQuery.sponsorType = sponsorType;
    if (location) searchQuery['location.city'] = { $regex: location, $options: 'i' };

    const sponsors = await Sponsor.find(searchQuery)
      .populate('user', 'name username email profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsor.countDocuments(searchQuery);

    res.json({
      sponsors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error searching sponsors:', error);
    res.status(500).json({ 
      message: 'Failed to search sponsors',
      error: error.message 
    });
  }
}; 

// Check for duplicate sponsor profiles and clean them up
exports.checkDuplicateSponsors = async (req, res) => {
  try {
    // Find all sponsors and group them by user ID
    const sponsors = await Sponsor.find({}).populate('user', 'name email');
    
    const userGroups = {};
    sponsors.forEach(sponsor => {
      const userId = sponsor.user?._id?.toString();
      if (userId) {
        if (!userGroups[userId]) {
          userGroups[userId] = [];
        }
        userGroups[userId].push(sponsor);
      }
    });

    // Find users with multiple sponsor profiles
    const duplicates = Object.entries(userGroups)
      .filter(([userId, sponsorList]) => sponsorList.length > 1)
      .map(([userId, sponsorList]) => ({
        userId,
        sponsors: sponsorList,
        count: sponsorList.length
      }));

    if (duplicates.length === 0) {
      return res.json({
        message: 'No duplicate sponsor profiles found',
        duplicates: []
      });
    }

    // For each duplicate, keep the one with the most recent activity
    let cleanedCount = 0;
    for (const duplicate of duplicates) {
      const { userId, sponsors } = duplicate;
      
      // Sort by creation date (newest first)
      sponsors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Keep the first one (newest), delete the rest
      const toDelete = sponsors.slice(1);
      
      for (const sponsorToDelete of toDelete) {
        await Sponsor.findByIdAndDelete(sponsorToDelete._id);
        cleanedCount++;
      }
    }

    res.json({
      message: `Found and cleaned ${duplicates.length} duplicate sponsor profiles`,
      duplicates: duplicates.map(d => ({
        userId: d.userId,
        count: d.count,
        keptSponsorId: d.sponsors[0]._id.toString()
      })),
      cleanedCount
    });

  } catch (error) {
    console.error('Error checking duplicate sponsors:', error);
    res.status(500).json({
      message: 'Failed to check duplicate sponsors',
      error: error.message
    });
  }
}; 