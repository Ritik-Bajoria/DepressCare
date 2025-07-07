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

/**
 * Send payment confirmation email to patient
 * @param {object} options - { userEmail, userName, amount, appointmentTime, paymentDate }
 * @returns {Promise}
 */
const sendPaymentConfirmation = async (options) => {
  const { userEmail, userName, amount, appointmentTime, paymentDate } = options;
  
  const subject = 'Payment Confirmation';
  const text = `Hello ${userName},\n\nYour payment of $${amount} for the appointment on ${appointmentTime} has been successfully processed on ${paymentDate}.\n\nThank you for choosing our services!`;
  const html = `
    <div>
      <h2>Payment Confirmation</h2>
      <p>Hello ${userName},</p>
      <p>Your payment of <strong>$${amount}</strong> for the appointment on <strong>${appointmentTime}</strong> has been successfully processed on <strong>${paymentDate}</strong>.</p>
      <p>Thank you for choosing our services!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

/**
 * Send payment notification to psychiatrist
 * @param {object} options - { userEmail, userName, patientName, amount, appointmentTime }
 * @returns {Promise}
 */
const sendPaymentNotification = async (options) => {
  const { userEmail, userName, patientName, amount, appointmentTime } = options;
  
  const subject = 'Payment Received for Appointment';
  const text = `Hello ${userName},\n\nA payment of $${amount} has been received for your appointment with ${patientName} scheduled for ${appointmentTime}.\n\nThank you!`;
  const html = `
    <div>
      <h2>Payment Received</h2>
      <p>Hello ${userName},</p>
      <p>A payment of <strong>$${amount}</strong> has been received for your appointment with <strong>${patientName}</strong> scheduled for <strong>${appointmentTime}</strong>.</p>
      <p>Thank you!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

/**
 * Send salary processed notification
 * @param {object} options - { userEmail, userName, amount, month, year, paymentStatus }
 * @returns {Promise}
 */
const sendSalaryProcessedNotification = async (options) => {
  const { userEmail, userName, amount, month, year, paymentStatus } = options;
  
  const subject = 'Your Salary Has Been Processed';
  const text = `Hello ${userName},\n\nYour salary of $${amount} for ${month} ${year} has been processed with status: ${paymentStatus}.\n\nYou will receive another notification when the payment is completed.\n\nThank you!`;
  const html = `
    <div>
      <h2>Salary Processed</h2>
      <p>Hello ${userName},</p>
      <p>Your salary of <strong>$${amount}</strong> for <strong>${month} ${year}</strong> has been processed with status: <strong>${paymentStatus}</strong>.</p>
      <p>You will receive another notification when the payment is completed.</p>
      <p>Thank you!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

/**
 * Send salary paid notification
 * @param {object} options - { userEmail, userName, amount, month, year, paymentDate }
 * @returns {Promise}
 */
const sendSalaryPaidNotification = async (options) => {
  const { userEmail, userName, amount, month, year, paymentDate } = options;
  
  const subject = 'Salary Payment Completed';
  const text = `Hello ${userName},\n\nYour salary of $${amount} for ${month} ${year} has been successfully paid on ${paymentDate}.\n\nThank you for your service!`;
  const html = `
    <div>
      <h2>Salary Payment Completed</h2>
      <p>Hello ${userName},</p>
      <p>Your salary of <strong>$${amount}</strong> for <strong>${month} ${year}</strong> has been successfully paid on <strong>${paymentDate}</strong>.</p>
      <p>Thank you for your service!</p>
    </div>
  `;

  return sendAppointmentEmail(userEmail, subject, text, html);
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotice,
  sendPaymentConfirmation,
  sendPaymentNotification,
  sendSalaryProcessedNotification,
  sendSalaryPaidNotification
};