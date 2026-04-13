const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Lister tous les clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des clients
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom, email, telephone FROM clients');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Obtenir un client par son ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Informations du client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Client introuvable
 */
router.get('/:id', authenticate, authorize('admin', 'client'), async (req, res) => {
  const { id } = req.params;

  // Un client ne peut voir que ses propres infos
  if (req.user.role === 'client' && req.user.id !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  try {
    const [rows] = await db.query('SELECT id, nom, email, telephone FROM clients WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Client introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /clients/{id}/livraisons:
 *   get:
 *     summary: Obtenir les livraisons d'un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Livraisons du client
 *       403:
 *         description: Accès refusé
 */
router.get('/:id/livraisons', authenticate, authorize('admin', 'client'), async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'client' && req.user.id !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  try {
    const [client] = await db.query('SELECT id FROM clients WHERE id = ?', [id]);
    if (client.length === 0) return res.status(404).json({ message: 'Client introuvable.' });

    const [rows] = await db.query(
      `SELECT l.id, l.heure_prevue, l.statut,
              a.rue, a.ville, a.code_postal,
              t.date AS date_tournee
       FROM livraisons l
       JOIN adresses a ON a.id = l.adresse_id
       JOIN tournees t ON t.id = l.tournee_id
       WHERE l.client_id = ?
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
