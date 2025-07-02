const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobPosting = sequelize.define('JobPosting', {
    job_id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    posted_by: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'user_id'
      }
    },
    title: { 
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: { 
      type: DataTypes.TEXT,
      allowNull: false
    },
    requirements: { 
      type: DataTypes.TEXT,
      allowNull: false
    },
    picture_url: { 
      type: DataTypes.STRING(255) 
    },
    posted_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, { 
    tableName: 'JobPostings', 
    timestamps: false 
  });

  JobPosting.associate = function(models) {
    JobPosting.belongsTo(models.User, {
      foreignKey: 'posted_by',
      as: 'poster'
    });
  };

  return JobPosting;
};