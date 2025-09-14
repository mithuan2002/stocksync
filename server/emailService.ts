
import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'flowstock.tool@gmail.com',
    pass: process.env.EMAIL_PASSWORD || '', // Set this in Replit secrets
  },
};

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(SMTP_CONFIG);
  }

  async sendLowStockAlert(notification: EmailNotification): Promise<boolean> {
    if (!process.env.EMAIL_PASSWORD) {
      console.warn('EMAIL_PASSWORD not configured - email notifications disabled');
      console.log('Would send email to:', notification.to);
      console.log('Subject:', notification.subject);
      console.log('Product:', notification.productName, 'SKU:', notification.sku);
      console.log('Stock:', notification.currentStock, 'Threshold:', notification.threshold);
      return true; // Return true to continue processing
    }

    try {
      const mailOptions = {
        from: `"FlowStock Alert System" <${SMTP_CONFIG.auth.user}>`,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  generateLowStockEmailTemplate(
    supplierName: string,
    productName: string,
    sku: string,
    currentStock: number,
    threshold: number,
    sellerCompany: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .product-details { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .urgent { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Low Stock Alert</h1>
          <p>Immediate Attention Required</p>
        </div>
        
        <div class="content">
          <p>Dear <strong>${supplierName}</strong>,</p>
          
          <div class="alert-box">
            <h3 class="urgent">STOCK CRITICAL - Immediate Action Required</h3>
            <p>One of your supplied products has fallen below the minimum stock threshold and requires urgent replenishment.</p>
          </div>
          
          <div class="product-details">
            <h3>Product Details:</h3>
            <p><strong>Product Name:</strong> ${productName}</p>
            <p><strong>SKU:</strong> ${sku}</p>
            <p><strong>Current Stock:</strong> <span class="urgent">${currentStock} units</span></p>
            <p><strong>Minimum Threshold:</strong> ${threshold} units</p>
            <p><strong>Requesting Company:</strong> ${sellerCompany}</p>
          </div>
          
          <p>Please arrange for immediate stock replenishment to avoid potential stockouts and lost sales opportunities.</p>
          
          <p>If you have any questions or need to discuss delivery schedules, please respond to this email or contact us directly.</p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br>
          <strong>FlowStock Inventory Management System</strong><br>
          On behalf of ${sellerCompany}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from FlowStock Inventory Management System</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
