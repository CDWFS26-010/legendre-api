const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /chauffeurs:
 *   get:
 *     summary: Lister tous les chauffeurs
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des chauffeurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chauffeur'
 *       403:
 *         description: Accès refusé
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom, prenom, email, telephone FROM chauffeurs');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /chauffeurs/{id}:
 *   get:
 *     summary: Obtenir un chauffeur par son ID
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID du chauffeur
 *     responses:
 *       200:
 *         description: Données du chauffeur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chauffeur'
 *       404:
 *         description: Chauffeur introuvable
 */
router.get('/:id', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

  // Un chauffeur ne peut voir que ses propres infos
  if (req.user.role === 'chauffeur' && req.user.id !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, telephone FROM chauffeurs WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Chauffeur introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /chauffeurs/{id}/tournees:
 *   get:
 *     summary: Obtenir les tournées d'un chauffeur
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID du chauffeur
 *     responses:
 *       200:
 *         description: Liste des tournées du chauffeur
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Chauffeur introuvable
 */
router.get('/:id/tournees', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

  // Un chauffeur ne peut voir que ses propres tournées
  if (req.user.role === 'chauffeur' && req.user.id !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  try {
    const [chauffeur] = await db.query('SELECT id FROM chauffeurs WHERE id = ?', [id]);
    if (chauffeur.length === 0) return res.status(404).json({ message: 'Chauffeur introuvable.' });

    const [rows] = await db.query(
      `SELECT t.id, t.date, 
              COUNT(l.id) as nb_livraisons
       FROM tournees t
       LEFT JOIN livraisons l ON l.tournee_id = t.id
       WHERE t.chauffeur_id = ?
       GROUP BY t.id
       ORDER BY t.date DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
