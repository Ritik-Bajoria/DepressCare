const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    appointment_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patient_id: { type: DataTypes.INTEGER },
    psychiatrist_id: { type: DataTypes.INTEGER },
    scheduled_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('Scheduled', 'Completed', 'Cancelled'), defaultValue: 'Scheduled' },
    meeting_link: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Appointments', timestamps: false });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'Patient'
    });
    Appointment.belongsTo(models.User, {
      foreignKey: 'psychiatrist_id',
      as: 'Psychiatrist'
    });
  };

  return Appointment;
};