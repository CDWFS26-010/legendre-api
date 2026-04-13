require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth');
const chauffeursRoutes = require('./routes/chauffeurs');
const tourneesRoutes = require('./routes/tournees');
const livraisonsRoutes = require('./routes/livraisons');
const clientsRoutes = require('./routes/clients');
const marchandisesRoutes = require('./routes/marchandises');

const app = express();

// ─── Middlewares de sécurité ─────────────────────────────────────────────────
app.use(helmet()); // Headers sécurisés
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Documentation Swagger ───────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'API LEGENDRE - Documentation',
}));

// ─── Routes API ──────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/chauffeurs', chauffeursRoutes);
app.use('/tournees', tourneesRoutes);
app.use('/livraisons', livraisonsRoutes);
app.use('/clients', clientsRoutes);
app.use('/marchandises', marchandisesRoutes);

// ─── Route racine ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'API Logistique LEGENDRE',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// ─── Gestion des routes inconnues ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} introuvable.` });
});

// ─── Gestion globale des erreurs ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

// ─── Démarrage ───────────────────────────────────────────────────────────────
// On ne démarre le serveur que si ce fichier est exécuté directement (pas en test)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📚 Documentation : http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app; // Export pour les tests
