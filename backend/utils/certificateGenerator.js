const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a certificate PDF from an HTML template.
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
 * @returns {Promise<{ filePath: string, certificateId: string }>}
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
  const certDir = path.join(__dirname, '../uploads/certificates');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  // 2. Generate QR code (data: verification URL + cert ID)
  const qrData = `${verificationUrl}${certificateId}`;
  const qrCode = await QRCode.toDataURL(qrData);

  // 3. Load HTML template
  let templatePath = path.join(__dirname, `../certificateTemplates/${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    // fallback to custom_award.html for unknown awards
    templatePath = path.join(__dirname, '../certificateTemplates/custom_award.html');
  }
  let html = fs.readFileSync(templatePath, 'utf-8');

  // 4. Replace placeholders
  html = html
    .replace(/{{participantName}}/g, participantName)
    .replace(/{{eventName}}/g, eventName)
    .replace(/{{eventDate}}/g, eventDate)
    .replace(/{{eventLocation}}/g, eventLocation)
    .replace(/{{awardTitle}}/g, awardTitle)
    .replace(/{{organizationLogo}}/g, organizationLogo)
    .replace(/{{signatureImage}}/g, signatureImage)
    .replace(/{{certificateId}}/g, certificateId)
    .replace(/{{qrCode}}/g, qrCode)
    .replace(/{{issueDate}}/g, issueDate);

  // 5. Render HTML to PDF using Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfPath = path.join(certDir, `${certificateId}.pdf`);
  await page.pdf({ path: pdfPath, width: '900px', height: '650px', printBackground: true });
  await browser.close();

  // Verify the file was created
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Certificate file was not created at ${pdfPath}`);
  }

  // Store the web-accessible path, not the absolute path
  const webPath = `/uploads/certificates/${certificateId}.pdf`;

  return { filePath: webPath, certificateId };
}

module.exports = { generateCertificate }; 