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
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des marchandises
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Marchandise'
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
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Détails de la marchandise
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Marchandise'
 *       404:
 *         description: Marchandise introuvable
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
 *               nom: { type: string, example: Palette de colis }
 *               poids: { type: number, example: 150.5 }
 *               volume: { type: number, example: 2.3 }
 *     responses:
 *       201:
 *         description: Marchandise créée
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
 *     tags: [Marchandises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *     responses:
 *       200:
 *         description: Marchandise mise à jour
 *       404:
 *         description: Marchandise introuvable
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
