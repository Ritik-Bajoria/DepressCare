const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityPost = sequelize.define('CommunityPost', {
    post_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      posted_by: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
    title: { type: DataTypes.STRING(255) },
    category: { type: DataTypes.STRING(255) },
    content: { type: DataTypes.TEXT },
    picture_url: { type: DataTypes.STRING(255) },
    posted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'CommunityPosts', timestamps: false });

  CommunityPost.associate = function(models) {
    CommunityPost.belongsTo(models.User, {
      foreignKey: 'posted_by',
      as: 'Author'
    });
  };

  return CommunityPost;
};