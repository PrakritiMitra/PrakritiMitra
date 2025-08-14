# Reports & Certificates Error Handling for Deleted Users

## Problem Statement

When users delete their accounts, reports and certificates need special handling because:

1. **Official Records**: Reports and certificates are official documents that should preserve the actual user information at the time of generation
2. **Data Integrity**: Historical reports must remain accurate and complete
3. **User Experience**: AI-generated reports should show actual names, not "Deleted User" placeholders
4. **Compliance**: Official documents must maintain audit trails and data completeness

## Key Principle

**Reports and certificates should NEVER show "Deleted User" - they should always display the actual user information that was recorded at the time of generation, regardless of whether the user account is currently deleted.**

## Implemented Solutions

### 1. Report Controller (`backend/controllers/reportController.js`)

#### Safe User Data Helper Function
Created a helper function to safely handle user data in reports:

```javascript
const getSafeUserDataForReports = (user) => {
  if (!user) {
    return {
      name: 'Unknown User',
      username: 'unknown_user',
      email: 'unknown@email.com'
    };
  }
  
  // If user is deleted but has actual data, preserve the actual data
  if (user.isDeleted) {
    return {
      name: user.name || 'Deleted User',
      username: user.username || 'deleted_user',
      email: user.email || 'deleted@email.com'
    };
  }
  
  return {
    name: user.name || 'Unknown User',
    username: user.username || 'unknown_user',
    email: user.email || 'unknown@email.com'
  };
};
```

#### AI Report Generation
Updated the AI report generation to use safe user data:

```javascript
// Fetch organizer questionnaires (completed ones) with safe user data
let organizerQuestionnaires = event.organizerTeam
  .filter(org => org.questionnaire.completed)
  .map(org => {
    const safeUserData = getSafeUserDataForReports(org.user);
    return {
      organizerName: safeUserData.name,  // Shows actual name even for deleted users
      answers: org.questionnaire.answers,
      submittedAt: org.questionnaire.submittedAt
    };
  });

// Fetch volunteer questionnaires (completed ones) with safe user data
const volunteerRegistrations = await Registration.find({
  eventId,
  'questionnaire.completed': true
}).populate('volunteerId', 'name username email isDeleted');

let volunteerQuestionnaires = volunteerRegistrations.map(reg => {
  const safeUserData = getSafeUserDataForReports(reg.volunteerId);
  return {
    volunteerName: safeUserData.name,  // Shows actual name even for deleted users
    answers: reg.questionnaire.answers,
    submittedAt: reg.questionnaire.submittedAt
  };
});
```

#### Report Retrieval
Updated report retrieval to handle deleted report generators:

```javascript
// Get safe user data for report generator
const safeGeneratorData = getSafeUserDataForReports(event.report.generatedBy);

res.json({
  report: {
    ...event.report.toObject(),
    generatedBy: {
      _id: event.report.generatedBy?._id,
      name: safeGeneratorData.name,      // Shows actual name even for deleted users
      email: safeGeneratorData.email     // Shows actual email even for deleted users
    }
  },
  eventTitle: event.title,
  eventType: event.eventType,
  eventDate: event.startDateTime
});
```

### 2. Certificate Generation (`backend/controllers/eventController.js`)

#### Safe User Data for Certificates
Updated certificate generation to use safe user data:

```javascript
// Get safe user data for certificate generation
const safeUserName = user.isDeleted ? (user.name || 'Deleted User') : (user.name || user.email || 'Unknown User');
const safeUserEmail = user.isDeleted ? (user.email || 'deleted@email.com') : (user.email || 'unknown@email.com');

// Generate the certificate with safe user data
const { filePath, certificateId } = await generateCertificate({
  participantName: safeUserName,  // Shows actual name even for deleted users
  eventName: event.title,
  eventDate: event.startDateTime ? event.startDateTime.toLocaleDateString('en-GB') : '',
  eventLocation: event.location || '',
  awardTitle: award,
  templateName,
  // ... other parameters
});
```

#### Certificate Storage
Updated certificate storage to preserve actual user information:

```javascript
event.certificates[certificateIndex] = {
  user: event.certificates[certificateIndex].user,
  role: event.certificates[certificateIndex].role,
  award: event.certificates[certificateIndex].award,
  certId: certificateId,
  filePath,
  issuedAt: new Date(),
  verificationUrl: `https://yourdomain.com/verify-certificate/${certificateId}`,
  name: safeUserName,  // Store actual name even for deleted users
  profileImage: user.profileImage || ''
};
```

### 3. Event Controller - Organizer Team (`backend/controllers/eventController.js`)

#### Enhanced Population
Updated organizer team retrieval to include `isDeleted` field:

```javascript
// Populate the user field inside organizerTeam including isDeleted flag
const event = await Event.findById(eventId).populate('organizerTeam.user', 'name username email phone profileImage isDeleted');
```

#### Safe User Data Transformation
The existing transformation logic already handles deleted users gracefully:

```javascript
// Check if user is deleted (this would be set by the user deletion process)
if (obj.user.isDeleted) {
  return {
    ...obj,
    user: {
      _id: obj.user._id,
      name: obj.user.name || 'Deleted User',        // Actual name preserved
      username: obj.user.username || 'deleted_user', // Actual username preserved
      email: obj.user.email || 'deleted@user.com',  // Actual email preserved
      phone: obj.user.phone || 'N/A',               // Actual phone preserved
      profileImage: obj.user.profileImage || null,
      isDeleted: true
    }
  };
}
```

## Data Flow

### 1. Report Generation
```
User completes questionnaire → Report generation triggered → Safe user data extracted
→ AI prompt constructed with actual names → Report generated with real user information
```

### 2. Certificate Generation
```
User eligible for certificate → Certificate generation triggered → Safe user data extracted
→ Certificate generated with actual participant name → Certificate stored with real user information
```

### 3. Data Retrieval
```
Frontend requests data → Backend populates user fields → Safe user data transformation applied
→ Actual user information returned even for deleted users
```

## Testing Scenarios

### 1. AI Report Generation with Deleted Users
- **Expected**: AI reports show actual user names in feedback sections
- **Test**: Verify organizer and volunteer names are preserved in report prompts
- **Test**: Verify deleted user data doesn't break report generation

### 2. Certificate Generation with Deleted Users
- **Expected**: Certificates show actual participant names
- **Test**: Verify certificates use real names, not "Deleted User" placeholders
- **Test**: Verify certificate storage preserves actual user information

### 3. Report Retrieval with Deleted Users
- **Expected**: Reports show actual generator names
- **Test**: Verify report metadata includes real user information
- **Test**: Verify deleted report generators don't break retrieval

### 4. Organizer Team with Deleted Users
- **Expected**: Organizer team shows actual user information
- **Test**: Verify organizer names, emails, and phones are preserved
- **Test**: Verify deleted organizers don't break team display

## Backward Compatibility

- **Existing functionality**: All existing report and certificate features work unchanged
- **Data preservation**: Historical reports and certificates remain intact
- **User experience**: No changes to how active users are handled
- **Enhanced safety**: Better handling of edge cases and deleted users

## Performance Impact

- **Minimal overhead**: Safe user data functions are lightweight
- **No additional queries**: All data is already available in the response
- **Efficient processing**: Data is processed once per request
- **Memory efficient**: No additional state or complex logic

## Security Considerations

- **Data preservation**: Official records maintain complete information
- **Privacy protection**: Sensitive data can be controlled as needed
- **Audit trail**: Complete report and certificate history is maintained
- **Access control**: Only authorized users can generate reports and certificates

## Future Enhancements

1. **Enhanced privacy**: Configurable privacy settings for deleted user data
2. **Data export**: Enhanced export options for compliance requirements
3. **Audit logging**: Track access to deleted user reports and certificates
4. **Data retention**: Configurable retention policies for official documents
5. **Backup strategies**: Enhanced backup for critical reports and certificates

## Files Modified

### Backend Controllers
- `backend/controllers/reportController.js` - Enhanced with safe user data handling
- `backend/controllers/eventController.js` - Enhanced certificate generation and organizer team handling

### Testing
- `backend/test-reports-certificates-deleted-users.js` - New comprehensive test script

### Documentation
- `backend/REPORTS_CERTIFICATES_DELETED_USERS_README.md` - This documentation file

## Conclusion

The implemented solution ensures that reports and certificates maintain complete data integrity while providing a seamless user experience. Key benefits include:

- **Data Preservation**: Actual user information is preserved for official records
- **User Experience**: AI reports and certificates show real names, not generic placeholders
- **Compliance**: Official documents maintain complete audit trails
- **Privacy**: Sensitive information can be controlled as needed
- **Performance**: Minimal overhead with efficient data handling

Reports and certificates now work seamlessly with deleted users, preserving the integrity of official documents while maintaining excellent user experience. The solution follows the principle that official records should never show generic placeholders but should always display the actual information that was recorded at the time of generation.

## Testing the Implementation

To test the implementation, run the test script:

```bash
cd backend
node test-reports-certificates-deleted-users.js
```

This will verify that:
- Reports preserve actual user information for deleted users
- Certificates use actual names, not "Deleted User" placeholders
- AI report prompts maintain data integrity
- Organizer team data handles deleted users gracefully
- All user data is preserved for official records
