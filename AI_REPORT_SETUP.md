# AI Event Report Generation Setup Guide

## Overview
This feature allows organizers to generate comprehensive AI-powered event reports after collecting sufficient feedback from both organizers and volunteers (50% completion rate required).

## Prerequisites

### 1. GroqCloud API Key
You need to obtain a GroqCloud API key to use the Llama 3.3 70B model for report generation.

1. Visit [GroqCloud](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Environment Variable Setup
Add the following environment variable to your backend `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Features

### For Organizers (EventDetailsPage.jsx)
- **Eligibility Check**: Automatically checks if 50%+ of both organizers and volunteers have completed their questionnaires
- **Progress Tracking**: Visual indicators showing completion rates for both groups
- **Report Generation**: One-click AI report generation using GroqCloud Llama 3.3 70B
- **Status Indicators**: Clear feedback on eligibility and generation status

### For Volunteers (VolunteerEventDetailsPage.jsx)
- **Report Viewing**: Access to generated reports for events they participated in
- **PDF Download**: Download reports as professionally formatted PDFs
- **Responsive Modal**: Full-screen report viewing with proper formatting

## API Endpoints

### Backend Routes (`/api/reports/`)
- `GET /eligibility/:eventId` - Check if event is eligible for report generation
- `POST /generate/:eventId` - Generate AI report for an event
- `GET /:eventId` - Retrieve generated report

## Database Schema Updates

### Event Model
```javascript
report: {
  content: { type: String, default: '' },
  generatedAt: { type: Date },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isGenerated: { type: Boolean, default: false }
}
```

## Workflow

### 1. Event Completion
- Event must be in the past
- Organizers and volunteers complete their respective questionnaires

### 2. Eligibility Check
- System checks if ≥50% of organizers have completed questionnaires
- System checks if ≥50% of volunteers have completed questionnaires
- Both conditions must be met for eligibility

### 3. Report Generation (Organizers Only)
- Eligible organizers see "Generate AI Report" button
- Click triggers comprehensive data aggregation:
  - Event details and existing AI summary
  - Completed organizer questionnaires
  - Completed volunteer questionnaires
  - Real-world environmental context and examples
- GroqCloud Llama 3.3 70B generates professional NGO-style report

### 4. Report Access (Volunteers)
- Registered volunteers can view and download generated reports
- Reports are formatted as professional NGO documents
- PDF download functionality with proper styling

## Report Content Structure
- Executive Summary
- Event Overview
- Participation & Engagement
- Impact Assessment
- Feedback Analysis
- Environmental Context & Relevance
- Challenges & Solutions
- Recommendations
- Conclusion

## Security & Permissions
- Only event organizers can generate reports
- Only registered volunteers can view reports
- Reports are only available for past events
- Proper authentication and authorization checks

## Error Handling
- Graceful fallbacks for API failures
- Clear error messages for users
- Logging for debugging purposes
- Eligibility validation before generation

## Testing Checklist
- [ ] Environment variables configured
- [ ] GroqCloud API key working
- [ ] Organizer questionnaire completion tracking
- [ ] Volunteer questionnaire completion tracking
- [ ] Eligibility calculation accuracy
- [ ] Report generation functionality
- [ ] Report viewing modal
- [ ] PDF download functionality
- [ ] Permission checks
- [ ] Error handling

## Troubleshooting

### Common Issues
1. **"GroqCloud API key not configured"**: Ensure GROQ_API_KEY is set in .env
2. **"Event not eligible"**: Check questionnaire completion rates
3. **"Only event organizers can generate reports"**: Verify user is in organizerTeam
4. **Report not loading**: Check network requests and API responses

### Debug Steps
1. Check browser console for errors
2. Verify API endpoints are responding
3. Check database for questionnaire completion data
4. Validate environment variables
5. Test GroqCloud API connectivity
