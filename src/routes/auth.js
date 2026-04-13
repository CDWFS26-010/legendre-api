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
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, prenom, email, password, telephone, role]
 *             properties:
 *               nom: { type: string, example: Dupont }
 *               prenom: { type: string, example: Jean }
 *               email: { type: string, example: jean.dupont@legendre.fr }
 *               password: { type: string, example: MotDePasse123 }
 *               telephone: { type: string, example: "0612345678" }
 *               role: { type: string, enum: [chauffeur, client, admin], example: chauffeur }
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       400:
 *         description: Données invalides ou email déjà utilisé
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
    // Vérifier si l'email existe déjà
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

    // Si c'est un chauffeur, créer aussi l'entrée dans la table chauffeurs
    if (role === 'chauffeur') {
      await db.query(
        'INSERT INTO chauffeurs (id, nom, prenom, email, telephone) VALUES (?, ?, ?, ?, ?)',
        [id, nom, prenom || '', email, telephone || '']
      );
    }

    // Si c'est un client, créer aussi l'entrée dans la table clients
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
 *               email: { type: string, example: jean.dupont@legendre.fr }
 *               password: { type: string, example: MotDePasse123 }
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne un token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 role: { type: string }
 *                 id: { type: string }
 *       401:
 *         description: Identifiants incorrects
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
