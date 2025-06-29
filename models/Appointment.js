const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    appointment_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patient_id: { type: DataTypes.INTEGER },
    psychiatrist_id: { type: DataTypes.INTEGER },
    scheduled_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('Scheduled', 'Completed', 'Cancelled','Pending'), defaultValue: 'Scheduled' },
    previous_diagnosis: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    short_description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meeting_link: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Appointments', timestamps: false });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'PatientUser'
    });
    
    Appointment.belongsTo(models.User, {
      foreignKey: 'psychiatrist_id',
      as: 'PsychiatristUser'
    });
    
    Appointment.hasMany(models.Prescription, {
      foreignKey: 'appointment_id',
      as: 'Prescriptions'
    });
    
    Appointment.hasOne(models.PatientPayment, {
      foreignKey: 'appointment_id',
      as: 'Payment'
    });
  };

  return Appointment;
};