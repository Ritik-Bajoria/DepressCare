const crypto = require('crypto');

const generateMeetingLink = () => {
  const randomString = crypto.randomBytes(16).toString('hex');
  return `https://meet.depresscare.com/${randomString}`;
};

module.exports = generateMeetingLink;