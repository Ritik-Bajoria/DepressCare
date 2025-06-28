const { v4: uuidv4 } = require('uuid');

/**
 * Generates a Jitsi Meet link for a therapy session
 * @param {Object} options - Meeting options
 * @param {string} options.psychiatristEmail - Psychiatrist's email (optional)
 * @param {string} options.patientEmail - Patient's email (optional)
 * @param {Date} options.startTime - Meeting start time
 * @param {Date} options.endTime - Meeting end time
 * @param {string} options.summary - Meeting title (optional)
 * @returns {Promise<string>} Jitsi Meet link
 */
const generateMeetingLink = async ({ 
  psychiatristEmail, 
  patientEmail, 
  startTime, 
  endTime, 
  summary = 'DepressCare Session'
}) => {
  try {
    const roomName = `DepressCare-${uuidv4()}`;
    const meetingUrl = `https://meet.jit.si/${roomName}`;
    return meetingUrl;
  } catch (error) {
    console.error('Error generating Jitsi meeting link:', error);
    throw new Error('Failed to create Jitsi meeting link');
  }
};

module.exports = generateMeetingLink;
