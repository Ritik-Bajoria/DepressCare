const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PsychiatristSalary = sequelize.define('PsychiatristSalary', {
    salary_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    psychiatrist_id: { type: DataTypes.INTEGER },
    month: { type: DataTypes.STRING(10) },
    year: { type: DataTypes.INTEGER },
    amount: { type: DataTypes.DECIMAL(10, 2) },
    payment_status: { type: DataTypes.ENUM('Paid', 'Pending'), defaultValue: 'Pending' },
    processed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'PsychiatristSalaries', timestamps: false });

  PsychiatristSalary.associate = (models) => {
    PsychiatristSalary.belongsTo(models.Psychiatrist, {
      foreignKey: 'psychiatrist_id',
      as: 'Psychiatrist'
    });
  };

  return PsychiatristSalary;
};