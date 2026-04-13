const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un compte utilisateur
 *     description: |
 *       Crée un nouveau compte utilisateur avec un rôle défini.
 *       Le mot de passe est automatiquement hashé avec bcrypt.
 *       Si le rôle est **chauffeur**, un profil chauffeur est également créé.
 *       Si le rôle est **client**, un profil client est également créé.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, email, password, role]
 *             properties:
 *               nom: { type: string }
 *               prenom: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               telephone: { type: string }
 *               role: { type: string, enum: [chauffeur, client, admin] }
 *           examples:
 *             Créer un chauffeur:
 *               value:
 *                 nom: Bernard
 *                 prenom: Lucas
 *                 email: l.bernard@legendre.fr
 *                 password: MotDePasse123
 *                 telephone: "0612345678"
 *                 role: chauffeur
 *             Créer un client:
 *               value:
 *                 nom: Moreau
 *                 prenom: Claire
 *                 email: c.moreau@email.fr
 *                 password: MotDePasse123
 *                 telephone: "0698765432"
 *                 role: client
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: Compte créé avec succès.
 *               id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *         content:
 *           application/json:
 *             examples:
 *               Champs manquants:
 *                 value:
 *                   message: "Champs obligatoires manquants : nom, email, password, role."
 *               Email déjà utilisé:
 *                 value:
 *                   message: Cet email est déjà utilisé.
 *               Rôle invalide:
 *                 value:
 *                   message: "Rôle invalide. Choisir parmi : chauffeur, client, admin."
 */
router.post('/register', async (req, res) => {
  const { nom, prenom, email, password, telephone, role } = req.body;

  if (!nom || !email || !password || !role) {
    return res.status(400).json({ message: 'Champs obligatoires manquants : nom, email, password, role.' });
  }

  const rolesValides = ['chauffeur', 'client', 'admin'];
  if (!rolesValides.includes(role)) {
    return res.status(400).json({ message: 'Rôle invalide. Choisir parmi : chauffeur, client, admin.' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.query(
      'INSERT INTO utilisateurs (id, nom, prenom, email, password, telephone, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nom, prenom || null, email, hashedPassword, telephone || null, role]
    );

    if (role === 'chauffeur') {
      await db.query(
        'INSERT INTO chauffeurs (id, nom, prenom, email, telephone) VALUES (?, ?, ?, ?, ?)',
        [id, nom, prenom || '', email, telephone || '']
      );
    }

    if (role === 'client') {
      await db.query(
        'INSERT INTO clients (id, nom, email, telephone) VALUES (?, ?, ?, ?)',
        [id, nom, email, telephone || '']
      );
    }

    res.status(201).json({ message: 'Compte créé avec succès.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Se connecter et obtenir un token JWT
 *     description: |
 *       Authentifie un utilisateur et retourne un **token JWT** à utiliser dans toutes les requêtes suivantes.
 *
 *       ➡️ **Cas d'usage chauffeur** : Pierre Martin se connecte le matin pour accéder à sa tournée du jour.
 *
 *       ➡️ **Cas d'usage client** : Marc Dupont se connecte pour suivre l'état de sa livraison.
 *
 *       ➡️ **Cas d'usage admin** : L'administrateur se connecte pour créer et gérer les tournées.
 *
 *       Le token obtenu doit être passé dans le header `Authorization: Bearer <token>` pour toutes les routes protégées.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *           examples:
 *             Login Admin:
 *               value:
 *                 email: admin@legendre.fr
 *                 password: Test1234!
 *             Login Chauffeur:
 *               value:
 *                 email: p.martin@legendre.fr
 *                 password: Test1234!
 *             Login Client:
 *               value:
 *                 email: m.dupont@email.fr
 *                 password: Test1234!
 *     responses:
 *       200:
 *         description: Connexion réussie — token JWT retourné
 *         content:
 *           application/json:
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImVtYWlsIjoiYWRtaW5AbGVnZW5kcmUuZnIiLCJyb2xlIjoiYWRtaW4ifQ.example
 *               role: admin
 *               id: 00000000-0000-0000-0000-000000000001
 *       400:
 *         description: Champs manquants
 *         content:
 *           application/json:
 *             example:
 *               message: Email et mot de passe requis.
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             example:
 *               message: Identifiants incorrects.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, role: user.role, id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;