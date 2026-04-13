const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /marchandises:
 *   get:
 *     summary: Lister toutes les marchandises
 *     description: |
 *       Retourne le catalogue complet des marchandises gérées par l'entreprise.
 *
 *       ➡️ **Cas d'usage** : L'administrateur ou un chauffeur consulte le catalogue pour identifier les types de colis disponibles.
 *
 *       🔒 **Accès** : Admin et Chauffeur.
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des marchandises
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000020
 *                 nom: Palette de colis
 *                 poids: 150
 *                 volume: 2.5
 *               - id: 00000000-0000-0000-0000-000000000021
 *                 nom: Carton standard
 *                 poids: 12.5
 *                 volume: 0.08
 *               - id: 00000000-0000-0000-0000-000000000022
 *                 nom: Colis fragile
 *                 poids: 5
 *                 volume: 0.03
 *       403:
 *         description: Accès refusé (client tente d'accéder)
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé. Permissions insuffisantes.
 */
router.get('/', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom, poids, volume FROM marchandises ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /marchandises/{id}:
 *   get:
 *     summary: Obtenir une marchandise par son ID
 *     description: |
 *       Retourne les détails d'une marchandise spécifique (nom, poids, volume).
 *
 *       ➡️ **Cas d'usage** : Un chauffeur consulte les détails d'une marchandise pour vérifier son poids avant chargement.
 *
 *       🔒 **Accès** : Admin et Chauffeur.
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000020
 *     responses:
 *       200:
 *         description: Détails de la marchandise
 *         content:
 *           application/json:
 *             example:
 *               id: 00000000-0000-0000-0000-000000000020
 *               nom: Palette de colis
 *               poids: 150
 *               volume: 2.5
 *       404:
 *         description: Marchandise introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Marchandise introuvable.
 */
router.get('/:id', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, nom, poids, volume FROM marchandises WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Marchandise introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /marchandises:
 *   post:
 *     summary: Créer une nouvelle marchandise
 *     description: |
 *       Ajoute une nouvelle marchandise au catalogue de l'entreprise.
 *
 *       ➡️ **Cas d'usage** : L'administrateur enregistre un nouveau type de colis dans le système (ex: nouveau produit d'un client).
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom]
 *             properties:
 *               nom: { type: string }
 *               poids: { type: number }
 *               volume: { type: number }
 *           examples:
 *             Palette lourde:
 *               value:
 *                 nom: Palette industrielle
 *                 poids: 500
 *                 volume: 4.8
 *             Petit colis:
 *               value:
 *                 nom: Petit colis postal
 *                 poids: 2.5
 *                 volume: 0.01
 *     responses:
 *       201:
 *         description: Marchandise créée avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: Marchandise créée.
 *               id: d4e5f6a7-b8c9-0123-defg-234567890123
 *       400:
 *         description: Nom manquant
 *         content:
 *           application/json:
 *             example:
 *               message: Le nom est obligatoire.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { nom, poids, volume } = req.body;

  if (!nom) return res.status(400).json({ message: 'Le nom est obligatoire.' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO marchandises (id, nom, poids, volume) VALUES (?, ?, ?, ?)',
      [id, nom, poids || null, volume || null]
    );
    res.status(201).json({ message: 'Marchandise créée.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /marchandises/{id}:
 *   put:
 *     summary: Mettre à jour une marchandise
 *     description: |
 *       Met à jour les informations d'une marchandise existante (nom, poids, volume).
 *
 *       ➡️ **Cas d'usage** : L'administrateur corrige le poids d'une marchandise suite à une erreur de saisie.
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000020
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               poids: { type: number }
 *               volume: { type: number }
 *           example:
 *             nom: Palette de colis (mise à jour)
 *             poids: 160
 *             volume: 2.8
 *     responses:
 *       200:
 *         description: Marchandise mise à jour
 *         content:
 *           application/json:
 *             example:
 *               message: Marchandise mise à jour.
 *       404:
 *         description: Marchandise introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Marchandise introuvable.
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { nom, poids, volume } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM marchandises WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Marchandise introuvable.' });

    await db.query(
      'UPDATE marchandises SET nom = COALESCE(?, nom), poids = COALESCE(?, poids), volume = COALESCE(?, volume) WHERE id = ?',
      [nom || null, poids || null, volume || null, id]
    );
    res.json({ message: 'Marchandise mise à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;