const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { cloudinary, deleteFile } = require('../config/cloudinary');

/**
 * Generate a certificate PDF from an HTML template and upload to Cloudinary.
 * @param {Object} options
 * @param {string} options.participantName
 * @param {string} options.eventName
 * @param {string} options.eventDate
 * @param {string} [options.eventLocation]
 * @param {string} options.awardTitle
 * @param {string} options.templateName - e.g. 'participation', 'best_volunteer', 'custom_award'
 * @param {string} [options.organizationLogo] - Path or URL to logo
 * @param {string} [options.signatureImage] - Path or URL to signature
 * @param {string} [options.issueDate]
 * @param {string} [options.verificationUrl]
 * @returns {Promise<{ filePath: string, certificateId: string, cloudinaryUrl: string, publicId: string }>}
 */
async function generateCertificate({
  participantName,
  eventName,
  eventDate,
  eventLocation = '',
  awardTitle = '',
  templateName,
  organizationLogo = '/public/images/default-logo.png',
  signatureImage = '/public/images/default-signature.png',
  issueDate = new Date().toLocaleDateString('en-GB'),
  verificationUrl = 'https://yourdomain.com/verify-certificate/',
}) {
  // 1. Generate unique certificate ID
  const certificateId = uuidv4();
  
  // 2. Create temporary directory for PDF generation
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 3. Generate QR code (data: verification URL + cert ID)
  const qrData = `${verificationUrl}${certificateId}`;
  const qrCode = await QRCode.toDataURL(qrData);

  // 4. Load HTML template
  let templatePath = path.join(__dirname, `../certificateTemplates/${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    // fallback to custom_award.html for unknown awards
    templatePath = path.join(__dirname, '../certificateTemplates/custom_award.html');
  }
  let html = fs.readFileSync(templatePath, 'utf-8');

  // 5. Prepare derived placeholders
  const eventLocationAt = eventLocation ? ` at ${eventLocation}` : '';

  // 6. Replace placeholders
  html = html
    .replace(/{{participantName}}/g, participantName)
    .replace(/{{eventName}}/g, eventName)
    .replace(/{{eventDate}}/g, eventDate)
    .replace(/{{eventLocation}}/g, eventLocation)
    .replace(/{{eventLocationAt}}/g, eventLocationAt)
    .replace(/{{awardTitle}}/g, awardTitle)
    .replace(/{{organizationLogo}}/g, organizationLogo)
    .replace(/{{signatureImage}}/g, signatureImage)
    .replace(/{{certificateId}}/g, certificateId)
    .replace(/{{qrCode}}/g, qrCode)
    .replace(/{{issueDate}}/g, issueDate);

  // 7. Render HTML to PDF using Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Create temporary PDF file
  const tempPdfPath = path.join(tempDir, `${certificateId}.pdf`);
  await page.pdf({ path: tempPdfPath, width: '900px', height: '650px', printBackground: true });
  await browser.close();

  // Verify the file was created
  if (!fs.existsSync(tempPdfPath)) {
    throw new Error(`Certificate file was not created at ${tempPdfPath}`);
  }

  try {
    // 8. Upload PDF to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempPdfPath, {
      folder: 'prakriti-mitra/certificates',
      public_id: certificateId,
      resource_type: 'raw',
      type: 'upload',
      access_mode: 'public',
      format: 'pdf'
    });

    // 9. Clean up temporary file
    fs.unlinkSync(tempPdfPath);

    // 10. Return Cloudinary URL and metadata
    return {
      filePath: uploadResult.secure_url, // Use Cloudinary URL instead of local path
      certificateId,
      cloudinaryUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      cloudinaryData: uploadResult
    };

  } catch (uploadError) {
    // Clean up temporary file even if upload fails
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
    
    console.error('Error uploading certificate to Cloudinary:', uploadError);
    throw new Error(`Failed to upload certificate to Cloudinary: ${uploadError.message}`);
  }
}

/**
 * Delete a certificate from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>}
 */
async function deleteCertificate(publicId) {
  try {
    return await deleteFile(publicId, 'raw');
  } catch (error) {
    console.error('Error deleting certificate from Cloudinary:', error);
    throw error;
  }
}

module.exports = { 
  generateCertificate,
  deleteCertificate
}; 