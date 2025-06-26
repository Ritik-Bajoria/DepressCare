const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    patient_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true,
      autoIncrement: true 
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
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
    }
  }, {
    tableName: 'Patients',
    timestamps: false
  });

    Patient.associate = (models) => {
    Patient.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User'
    });
  };

  return Patient;
};
