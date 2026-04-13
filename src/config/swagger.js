const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Logistique LEGENDRE',
      version: '1.0.0',
      description: 'API REST sécurisée de gestion de tournées et livraisons pour l\'entreprise LEGENDRE',
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
        Adresse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          rue: { type: 'string' },
          ville: { type: 'string' },
          code_postal: { type: 'string' },
          pays: { type: 'string' },
        },
      },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
