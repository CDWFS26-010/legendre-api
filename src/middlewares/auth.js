const jwt = require('jsonwebtoken');

/**
 * Vérifie le token JWT dans le header Authorization
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Token manquant. Authentification requise.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' });
  }
};

/**
 * Vérifie que l'utilisateur a le bon rôle
 * @param {...string} roles - Rôles autorisés (ex: 'admin', 'chauffeur', 'client')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé. Permissions insuffisantes.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
