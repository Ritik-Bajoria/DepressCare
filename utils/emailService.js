const nodemailer = require('nodemailer');

// Configure your email transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send appointment notification email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email text content
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
const sendAppointmentEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"DepressCare" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send appointment confirmation email
 * @param {object} options - { userEmail, userName, psychiatristName, appointmentTime, meetingLink }
 * @returns {Promise}
 */
const sendBookingConfirmation = async (options) => {
  const { userEmail, userName, psychiatristName, appointmentTime, meetingLink } = options;
  
  const subject = 'Your Appointment Has Been Booked';
  const text = `Hello ${userName},\n\nYour appointment with ${psychiatristName} has been successfully booked for ${appointmentTime}.\n\nMeeting Link: ${meetingLink}\n\nThank you!`;
  const html = `
    <div>
      <h2>Appointment Confirmation</h2>
      <p>Hello ${userName},</p>
      <p>Your appointment with <strong>${psychiatristName}</strong> has been successfully booked for <strong>${appointmentTime}</strong>.</p>
      <p><strong>Meeting Link:</strong> <a href="${meetingLink}">Join Meeting</a></p>
      <p>Thank you!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

/**
 * Send appointment cancellation email
 * @param {object} options - { userEmail, userName, psychiatristName, appointmentTime }
 * @returns {Promise}
 */
const sendCancellationNotice = async (options) => {
  const { userEmail, userName, psychiatristName, appointmentTime } = options;
  
  const subject = 'Your Appointment Has Been Cancelled';
  const text = `Hello ${userName},\n\nYour appointment with ${psychiatristName} scheduled for ${appointmentTime} has been cancelled.\n\nThank you!`;
  const html = `
    <div>
      <h2>Appointment Cancellation</h2>
      <p>Hello ${userName},</p>
      <p>Your appointment with <strong>${psychiatristName}</strong> scheduled for <strong>${appointmentTime}</strong> has been cancelled.</p>
      <p>Thank you!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotice
};