const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.STRING(255) },
    gender: { type: DataTypes.ENUM('Male', 'Female', 'Other') },
    date_of_birth: { type: DataTypes.DATEONLY },
    role: { type: DataTypes.ENUM('Patient', 'Psychiatrist', 'Admin', 'InternalManagement'), allowNull: false },
    profile_picture: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'users', timestamps: false });

  User.associate = (models) => {
    User.hasMany(models.DepressionForm, {
      foreignKey: 'patient_id',
      as: 'DepressionForms'
    });
    User.hasOne(models.Psychiatrist, {
      foreignKey: 'psychiatrist_id',
      as: 'Psychiatrist'
    });
    User.hasOne(models.Patient, {
      foreignKey: 'user_id',
      as: 'Patient'
    });  
    User.hasMany(models.Appointment, {
      foreignKey: 'patient_id',
      as: 'PatientAppointments'
    });
    User.hasMany(models.Appointment, {
      foreignKey: 'psychiatrist_id',
      as: 'PsychiatristAppointments'
    });
    User.hasMany(models.Recommendation, {
      foreignKey: 'psychiatrist_id',
      as: 'GivenRecommendations'
    });
    
    User.hasMany(models.Recommendation, {
      foreignKey: 'patient_id',
      as: 'ReceivedRecommendations'
    });
    User.hasMany(models.CommunityPost, {
      foreignKey: 'posted_by',
      as: 'CommunityPosts'
    });
    User.hasMany(models.JobPosting, {
      foreignKey: 'posted_by',
      as: 'JobPostings'
    });
  };

  return User;
};
