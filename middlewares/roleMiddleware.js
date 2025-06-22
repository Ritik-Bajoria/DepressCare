const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();

    const allowed = allowedRoles.map(role => role.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

module.exports = roleMiddleware;
