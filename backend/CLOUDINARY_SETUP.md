# Cloudinary Setup Guide

## Phase 1: Cloudinary Account Setup

### 1. Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address
4. Access your dashboard

### 2. Get Your Credentials
From your Cloudinary dashboard, note down:
- **Cloud Name**: Found in the dashboard header
- **API Key**: Found in Account Details > API Keys
- **API Secret**: Found in Account Details > API Keys

### 3. Environment Configuration

Add these variables to your `.env` file in the backend directory:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Complete .env File Example

```env
# Database
MONGODB_URI=mongodb://localhost:27017/prakritimitra
MONGO_URI=mongodb://localhost:27017/prakritimitra

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email Configuration
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
NODE_ENV=development

# Account Management
ACCOUNT_RETENTION_DAYS=7
```

## Cloudinary Folder Structure

The application will create the following folder structure in your Cloudinary account:

```
prakriti-mitra/
├── organizations/     # Organization logos and documents
├── profiles/         # User profile images
├── events/          # Event images and banners
├── chat/            # Chat file uploads
├── certificates/    # Generated PDF certificates
├── qrcodes/         # Generated QR codes
└── general/         # General file uploads
```

## File Type Support

### Images
- **Formats**: JPG, JPEG, PNG, GIF
- **Optimization**: Automatic quality and format optimization
- **Transformations**: Automatic resizing and cropping

### Documents
- **Formats**: PDF, DOC, DOCX
- **Storage**: Raw format preservation
- **Access**: Direct download links

### Special Features
- **Profile Images**: Face detection and cropping
- **Event Images**: Banner optimization (1200x800)
- **QR Codes**: Fixed size (300x300)
- **Certificates**: PDF preservation

## Security Considerations

### Upload Presets
- File size limits
- Allowed formats
- Transformation restrictions

### Access Control
- Public read access for images
- Private access for sensitive documents
- Signed URLs for temporary access

### CORS Configuration
Configure CORS in your Cloudinary settings:
- Allowed origins: Your domain
- Allowed methods: GET, POST, PUT, DELETE
- Allowed headers: Content-Type, Authorization

## Testing Your Setup

1. **Verify Environment Variables**:
   ```bash
   node -e "console.log('Cloudinary Config:', { cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing' })"
   ```

2. **Test Upload**:
   - Start your server
   - Try uploading a profile image
   - Check Cloudinary dashboard for the uploaded file

3. **Check Folder Structure**:
   - Verify folders are created automatically
   - Check file organization

## Next Steps

After completing Phase 1:
1. **Phase 2**: Update upload middleware
2. **Phase 3**: Modify controllers
3. **Phase 4**: Update frontend components
4. **Phase 5**: Data migration

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**:
   - Double-check your API key and secret
   - Ensure no extra spaces in .env file

2. **"Cloud name not found" error**:
   - Verify your cloud name is correct
   - Check for typos

3. **Upload failures**:
   - Check file size limits
   - Verify allowed file formats
   - Check network connectivity

### Support
- Cloudinary Documentation: [docs.cloudinary.com](https://docs.cloudinary.com)
- Cloudinary Support: Available in dashboard
- Community Forum: [support.cloudinary.com](https://support.cloudinary.com)
