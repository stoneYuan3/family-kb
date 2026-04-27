const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const editorOnly = (req, res, next) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Edit access required' });
  }
  next();
};

const selfOrAdmin = (req, res, next) => {
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
};

module.exports = { adminOnly, selfOrAdmin, editorOnly };