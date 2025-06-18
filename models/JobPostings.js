const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobPosting = sequelize.define('JobPosting', {
    job_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    posted_by: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    requirements: { type: DataTypes.TEXT },
    posted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'JobPostings', timestamps: false });

  return JobPosting;
};
