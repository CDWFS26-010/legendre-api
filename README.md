# API Logistique LEGENDRE 🚚

API REST sécurisée de gestion de tournées et livraisons pour l'entreprise de transport LEGENDRE.

## Stack technique

- **Runtime** : Node.js
- **Framework** : Express.js
- **Base de données** : MySQL (WAMP)
- **Authentification** : JWT (JSON Web Tokens)
- **Sécurité** : bcrypt, helmet, CORS
- **Documentation** : Swagger / OpenAPI 3.0
- **Tests** : Jest + Supertest

---

## Installation

### 1. Cloner le dépôt
```bash
git clone https://github.com/CDWFS26-010/legendre-api.git
cd legendre-api
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement

Copier le fichier `.env.example` et le renommer en `.env` :
```bash
cp .env.example .env
```

Puis éditer `.env` avec vos paramètres :
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=legendre_db

JWT_SECRET=votre_secret_ici
JWT_EXPIRES_IN=24h
```

> ⚠️ Avec WAMP, `DB_PASSWORD` est vide par défaut. Le `JWT_SECRET` peut être n'importe quelle chaîne longue et aléatoire.

### 4. Créer la base de données via phpMyAdmin

Selon votre environnement local, ouvrir phpMyAdmin à l'URL correspondante :

| Environnement | URL phpMyAdmin                   |
|---------------|----------------------------------|
| WAMP          | http://localhost/phpmyadmin      |
| XAMPP         | http://localhost/phpmyadmin      |
| MAMP          | http://localhost:8888/phpmyadmin |
| Laragon       | http://localhost/phpmyadmin      |

> ⚠️ Avec **MAMP**, le port MySQL est `8889` par défaut → mettre `DB_PORT=8889` dans le `.env`, et `DB_PASSWORD=root` par défaut.

Ensuite :

1. Cliquer sur **"Importer"** dans le menu du haut
2. Cliquer sur **"Choisir un fichier"** → sélectionner `database/legendre_db.sql`
3. Cliquer sur **"Exécuter"**

La base `legendre_db` avec toutes les tables et les données de test sera créée automatiquement.

### 5. Générer les hash bcrypt des mots de passe

Les comptes de test ont besoin de vrais hash bcrypt. Lancer cette commande dans le terminal :

```bash
node -e "const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync('Test1234!', 12); console.log(hash);"
```

Copier le hash affiché, puis dans phpMyAdmin → base `legendre_db` → onglet **SQL**, exécuter :

```sql
UPDATE utilisateurs SET password = 'COLLER_LE_HASH_ICI';
```

### 6. Démarrer le serveur

```bash
# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

Le serveur démarre sur **http://localhost:3000**
La documentation Swagger est disponible sur **http://localhost:3000/api-docs**

---

## Comptes de test

| Rôle      | Email                | Mot de passe |
|-----------|----------------------|--------------|
| Admin     | admin@legendre.fr    | Test1234!    |
| Chauffeur | p.martin@legendre.fr | Test1234!    |
| Chauffeur | s.leroy@legendre.fr  | Test1234!    |
| Client    | m.dupont@email.fr    | Test1234!    |
| Client    | a.bernard@email.fr   | Test1234!    |

---

## Endpoints disponibles

### Authentification (public)
| Méthode | Route          | Description              |
|---------|----------------|--------------------------|
| POST    | /auth/register | Créer un compte          |
| POST    | /auth/login    | Se connecter → token JWT |

### Chauffeurs
| Méthode | Route                    | Rôles autorisés        |
|---------|--------------------------|------------------------|
| GET     | /chauffeurs              | admin                  |
| GET     | /chauffeurs/:id          | admin, chauffeur (soi) |
| GET     | /chauffeurs/:id/tournees | admin, chauffeur (soi) |

### Tournées
| Méthode | Route                    | Rôles autorisés        |
|---------|--------------------------|------------------------|
| GET     | /tournees                | admin                  |
| POST    | /tournees                | admin                  |
| GET     | /tournees/:id            | admin, chauffeur       |
| GET     | /tournees/:id/livraisons | admin, chauffeur       |

### Livraisons
| Méthode | Route                    | Rôles autorisés           |
|---------|--------------------------|---------------------------|
| GET     | /livraisons              | admin                     |
| POST    | /livraisons              | admin                     |
| GET     | /livraisons/:id          | admin, chauffeur, client  |
| PATCH   | /livraisons/:id/statut   | admin, chauffeur          |

### Clients
| Méthode | Route                    | Rôles autorisés        |
|---------|--------------------------|------------------------|
| GET     | /clients                 | admin                  |
| GET     | /clients/:id             | admin, client (soi)    |
| GET     | /clients/:id/livraisons  | admin, client (soi)    |

### Marchandises
| Méthode | Route             | Rôles autorisés   |
|---------|-------------------|-------------------|
| GET     | /marchandises     | admin, chauffeur  |
| POST    | /marchandises     | admin             |
| GET     | /marchandises/:id | admin, chauffeur  |
| PUT     | /marchandises/:id | admin             |

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
  -d "{\"email\": \"admin@legendre.fr\", \"password\": \"Test1234!\"}"
```

---

## Statuts de livraison

| Valeur     | Description           |
|------------|-----------------------|
| en_attente | Pas encore démarrée   |
| en_cours   | En cours de livraison |
| livree     | Livrée avec succès    |
| echec      | Échec de livraison    |

---

## Tests

```bash
npm test
```

49 tests automatisés couvrant :
- Authentification (login, mauvais mdp, token invalide...)
- Isolation des rôles (admin / chauffeur / client)
- CRUD sur tous les endpoints
- Cas nominaux et cas d'erreur (400, 401, 403, 404)

---

## Documentation Swagger

Disponible sur : **http://localhost:3000/api-docs**

Permet de tester tous les endpoints directement dans le navigateur avec le bouton **Authorize 🔓**.

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
│   └── legendre_db.sql       # Script SQL + données de test
├── postman/
│   └── LEGENDRE_collection.json  # Collection Postman
├── src/
│   ├── config/
│   │   ├── db.js             # Connexion MySQL
│   │   └── swagger.js        # Configuration Swagger
│   ├── middlewares/
│   │   └── auth.js           # JWT + gestion des rôles
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chauffeurs.js
│   │   ├── tournees.js
│   │   ├── livraisons.js
│   │   ├── clients.js
│   │   └── marchandises.js
│   └── server.js             # Point d'entrée
├── tests/
│   └── api.test.js           # 49 tests Jest + Supertest
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Dépôt Git

[https://github.com/CDWFS26-010/legendre-api](https://github.com/CDWFS26-010/legendre-api)