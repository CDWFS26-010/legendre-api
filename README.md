# API Logistique LEGENDRE 🚚

API REST sécurisée de gestion de tournées et livraisons pour l'entreprise de transport LEGENDRE.

## Stack technique

- **Runtime** : Node.js
- **Framework** : Express.js
- **Base de données** : MySQL
- **Authentification** : JWT (JSON Web Tokens)
- **Sécurité** : bcrypt, helmet, CORS
- **Documentation** : Swagger / OpenAPI 3.0
- **Tests** : Jest + Supertest

---

## Installation

### 1. Cloner le dépôt
```bash
git clone <url-du-repo>
cd legendre-api
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
# Éditer .env avec vos paramètres MySQL et un JWT_SECRET fort
```

### 4. Créer la base de données
```bash
mysql -u root -p < database/legendre_db.sql
```

### 5. Démarrer le serveur
```bash
# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

---

## Comptes de test

| Rôle      | Email                     | Mot de passe |
|-----------|---------------------------|--------------|
| Admin     | admin@legendre.fr         | Test1234!    |
| Chauffeur | p.martin@legendre.fr      | Test1234!    |
| Chauffeur | s.leroy@legendre.fr       | Test1234!    |
| Client    | m.dupont@email.fr         | Test1234!    |
| Client    | a.bernard@email.fr        | Test1234!    |

> ⚠️ Les mots de passe dans le script SQL sont des hash bcrypt. Utilisez `Test1234!` lors du login.

---

## Endpoints disponibles

### Authentification (public)
| Méthode | Route           | Description              |
|---------|-----------------|--------------------------|
| POST    | /auth/register  | Créer un compte          |
| POST    | /auth/login     | Se connecter → token JWT |

### Chauffeurs
| Méthode | Route                       | Rôles autorisés         |
|---------|-----------------------------|-------------------------|
| GET     | /chauffeurs                 | admin                   |
| GET     | /chauffeurs/:id             | admin, chauffeur (soi)  |
| GET     | /chauffeurs/:id/tournees    | admin, chauffeur (soi)  |

### Tournées
| Méthode | Route                       | Rôles autorisés         |
|---------|-----------------------------|-------------------------|
| GET     | /tournees                   | admin                   |
| POST    | /tournees                   | admin                   |
| GET     | /tournees/:id               | admin, chauffeur        |
| GET     | /tournees/:id/livraisons    | admin, chauffeur        |

### Livraisons
| Méthode | Route                       | Rôles autorisés              |
|---------|-----------------------------|------------------------------|
| GET     | /livraisons                 | admin                        |
| POST    | /livraisons                 | admin                        |
| GET     | /livraisons/:id             | admin, chauffeur, client     |
| PATCH   | /livraisons/:id/statut      | admin, chauffeur             |

### Clients
| Méthode | Route                       | Rôles autorisés         |
|---------|-----------------------------|-------------------------|
| GET     | /clients                    | admin                   |
| GET     | /clients/:id                | admin, client (soi)     |
| GET     | /clients/:id/livraisons     | admin, client (soi)     |

### Marchandises
| Méthode | Route                       | Rôles autorisés         |
|---------|-----------------------------|-------------------------|
| GET     | /marchandises               | admin, chauffeur        |
| POST    | /marchandises               | admin                   |
| GET     | /marchandises/:id           | admin, chauffeur        |
| PUT     | /marchandises/:id           | admin                   |

---

## Authentification

Toutes les routes (sauf `/auth/*`) nécessitent un token JWT dans le header :

```
Authorization: Bearer <votre_token>
```

**Exemple de login :**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@legendre.fr", "password": "Test1234!"}'
```

---

## Statuts de livraison

| Valeur      | Description          |
|-------------|----------------------|
| en_attente  | Pas encore démarrée  |
| en_cours    | En cours de livraison|
| livree      | Livrée avec succès   |
| echec       | Échec de livraison   |

---

## Tests

```bash
npm test
```

Les tests couvrent :
- Authentification (login réussi, mauvais mdp, champs manquants)
- Contrôle des rôles (403 si non autorisé, 401 si non connecté)
- CRUD sur tous les endpoints
- Cas nominaux et cas d'erreur

---

## Documentation Swagger

Disponible sur : **http://localhost:3000/api-docs**

---

## Sécurité

- **bcrypt** (salt=12) : hashage des mots de passe
- **JWT** : tokens d'authentification avec expiration configurable
- **helmet** : sécurisation des headers HTTP
- **CORS** : contrôle des origines autorisées
- **Isolation des données** : chaque utilisateur ne voit que ses propres données

---

## Structure du projet

```
legendre-api/
├── database/
│   └── legendre_db.sql      # Script de création + données de test
├── src/
│   ├── config/
│   │   ├── db.js            # Connexion MySQL
│   │   └── swagger.js       # Configuration Swagger
│   ├── middlewares/
│   │   └── auth.js          # JWT + gestion des rôles
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chauffeurs.js
│   │   ├── tournees.js
│   │   ├── livraisons.js
│   │   ├── clients.js
│   │   └── marchandises.js
│   └── server.js            # Point d'entrée
├── tests/
│   └── api.test.js          # Tests Jest + Supertest
├── .env.example
├── package.json
└── README.md
```
