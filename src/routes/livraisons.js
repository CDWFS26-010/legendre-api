const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

const STATUTS_VALIDES = ['en_attente', 'en_cours', 'livree', 'echec'];

/**
 * @swagger
 * /livraisons:
 *   get:
 *     summary: Lister toutes les livraisons
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des livraisons
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.id, l.heure_prevue, l.statut,
              cl.nom AS client_nom,
              a.ville, a.rue,
              t.date AS date_tournee
       FROM livraisons l
       JOIN clients cl ON cl.id = l.client_id
       JOIN adresses a ON a.id = l.adresse_id
       JOIN tournees t ON t.id = l.tournee_id
       ORDER BY t.date DESC, l.heure_prevue ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /livraisons/{id}:
 *   get:
 *     summary: Obtenir le détail d'une livraison
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Détail de la livraison
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livraison introuvable
 */
router.get('/:id', authenticate, authorize('admin', 'chauffeur', 'client'), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT l.id, l.heure_prevue, l.statut, l.tournee_id, l.client_id,
              cl.nom AS client_nom, cl.email AS client_email, cl.telephone AS client_telephone,
              a.rue, a.ville, a.code_postal, a.pays
       FROM livraisons l
       JOIN clients cl ON cl.id = l.client_id
       JOIN adresses a ON a.id = l.adresse_id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Livraison introuvable.' });

    const livraison = rows[0];

    // Un client ne peut voir que ses propres livraisons
    if (req.user.role === 'client' && livraison.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    // Récupérer les marchandises
    const [marchandises] = await db.query(
      `SELECT m.id, m.nom, m.poids, m.volume, lm.quantite
       FROM livraison_marchandises lm
       JOIN marchandises m ON m.id = lm.marchandise_id
       WHERE lm.livraison_id = ?`,
      [id]
    );
    livraison.marchandises = marchandises;

    res.json(livraison);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /livraisons:
 *   post:
 *     summary: Créer une nouvelle livraison
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tournee_id, client_id, adresse_id]
 *             properties:
 *               tournee_id: { type: string, format: uuid }
 *               client_id: { type: string, format: uuid }
 *               adresse_id: { type: string, format: uuid }
 *               heure_prevue: { type: string, format: date-time, example: "2026-04-14T09:00:00" }
 *     responses:
 *       201:
 *         description: Livraison créée
 *       400:
 *         description: Données invalides
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { tournee_id, client_id, adresse_id, heure_prevue } = req.body;

  if (!tournee_id || !client_id || !adresse_id) {
    return res.status(400).json({ message: 'tournee_id, client_id et adresse_id sont obligatoires.' });
  }

  try {
    // Vérifier que les entités existent
    const [[t], [c], [a]] = await Promise.all([
      db.query('SELECT id FROM tournees WHERE id = ?', [tournee_id]),
      db.query('SELECT id FROM clients WHERE id = ?', [client_id]),
      db.query('SELECT id FROM adresses WHERE id = ?', [adresse_id]),
    ]);

    if (t.length === 0) return res.status(404).json({ message: 'Tournée introuvable.' });
    if (c.length === 0) return res.status(404).json({ message: 'Client introuvable.' });
    if (a.length === 0) return res.status(404).json({ message: 'Adresse introuvable.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO livraisons (id, tournee_id, client_id, adresse_id, heure_prevue, statut) VALUES (?, ?, ?, ?, ?, ?)',
      [id, tournee_id, client_id, adresse_id, heure_prevue || null, 'en_attente']
    );

    res.status(201).json({ message: 'Livraison créée.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /livraisons/{id}/statut:
 *   patch:
 *     summary: Mettre à jour le statut d'une livraison
 *     tags: [Livraisons]
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
 *             required: [statut]
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [en_attente, en_cours, livree, echec]
 *                 example: livree
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Statut invalide
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livraison introuvable
 */
router.patch('/:id/statut', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  if (!statut || !STATUTS_VALIDES.includes(statut)) {
    return res.status(400).json({ message: `Statut invalide. Valeurs acceptées : ${STATUTS_VALIDES.join(', ')}.` });
  }

  try {
    const [rows] = await db.query(
      `SELECT l.id, t.chauffeur_id FROM livraisons l
       JOIN tournees t ON t.id = l.tournee_id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Livraison introuvable.' });

    // Un chauffeur ne peut modifier que les livraisons de ses tournées
    if (req.user.role === 'chauffeur' && rows[0].chauffeur_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    await db.query('UPDATE livraisons SET statut = ? WHERE id = ?', [statut, id]);
    res.json({ message: 'Statut mis à jour.', statut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
