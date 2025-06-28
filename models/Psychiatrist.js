const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Psychiatrist = sequelize.define('Psychiatrist', {
    psychiatrist_id: { type: DataTypes.INTEGER, primaryKey: true },
    license_number: { type: DataTypes.STRING(50), unique: true },
    qualifications: { type: DataTypes.TEXT },
    specialization: { type: DataTypes.STRING(100) },
    years_of_experience: { type: DataTypes.INTEGER },
    bio: { type: DataTypes.TEXT },
    availability: { type: DataTypes.BOOLEAN }
  }, { tableName: 'Psychiatrists', timestamps: false });

  Psychiatrist.associate = (models) => {
    Psychiatrist.belongsTo(models.User, {
      foreignKey: 'psychiatrist_id',
      as: 'User'
    });
    Psychiatrist.hasMany(models.Appointment, {
      foreignKey: 'psychiatrist_id',
      as: 'Appointments'
    });
    Psychiatrist.hasMany(models.PsychiatristSalary, {
      foreignKey: 'psychiatrist_id',
      as: 'Salaries'
    });
  };
  
  return Psychiatrist;
};