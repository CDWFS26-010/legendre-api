const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Logistique LEGENDRE',
      version: '1.0.0',
      description: `


API sécurisée de gestion de tournées et livraisons pour l'entreprise LEGENDRE.

---

## 🚀 Comment tester cette API

**Étape 1** — Se connecter via \`POST /auth/login\` et copier le token retourné.

**Étape 2** — Cliquer sur **Authorize 🔓** en haut à droite et coller le token.

**Étape 3** — Tester les routes !

### Comptes de test disponibles
| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@legendre.fr | Test1234! |
| Chauffeur | p.martin@legendre.fr | Test1234! |
| Chauffeur | s.leroy@legendre.fr | Test1234! |
| Client | m.dupont@email.fr | Test1234! |
| Client | a.bernard@email.fr | Test1234! |


---

## 🔒 Rôles et accès
- **Admin** : accès complet à toutes les ressources
- **Chauffeur** : accès à ses propres tournées et livraisons uniquement
- **Client** : accès à ses propres livraisons uniquement
`,
    },
    servers: [{ url: 'http://localhost:3000', description: 'Serveur de développement' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Chauffeur: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string' },
          },
        },
        Tournee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            chauffeur_id: { type: 'string', format: 'uuid' },
          },
        },
        Livraison: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            heure_prevue: { type: 'string', format: 'date-time' },
            statut: { type: 'string', enum: ['en_attente', 'en_cours', 'livree', 'echec'] },
            tournee_id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            adresse_id: { type: 'string', format: 'uuid' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string' },
          },
        },
        Marchandise: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string' },
            poids: { type: 'number' },
            volume: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);