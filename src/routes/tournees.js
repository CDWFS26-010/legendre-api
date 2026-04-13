const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /tournees:
 *   get:
 *     summary: Lister toutes les tournées
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des tournées
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.date, 
              c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom,
              COUNT(l.id) AS nb_livraisons
       FROM tournees t
       JOIN chauffeurs c ON c.id = t.chauffeur_id
       LEFT JOIN livraisons l ON l.tournee_id = t.id
       GROUP BY t.id
       ORDER BY t.date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /tournees:
 *   post:
 *     summary: Créer une nouvelle tournée
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, chauffeur_id]
 *             properties:
 *               date: { type: string, format: date, example: "2026-04-14" }
 *               chauffeur_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Tournée créée
 *       400:
 *         description: Données invalides
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { date, chauffeur_id } = req.body;

  if (!date || !chauffeur_id) {
    return res.status(400).json({ message: 'date et chauffeur_id sont obligatoires.' });
  }

  try {
    const [chauffeur] = await db.query('SELECT id FROM chauffeurs WHERE id = ?', [chauffeur_id]);
    if (chauffeur.length === 0) return res.status(404).json({ message: 'Chauffeur introuvable.' });

    const id = uuidv4();
    await db.query('INSERT INTO tournees (id, date, chauffeur_id) VALUES (?, ?, ?)', [id, date, chauffeur_id]);
    res.status(201).json({ message: 'Tournée créée.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /tournees/{id}:
 *   get:
 *     summary: Obtenir une tournée avec ses livraisons
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Détails de la tournée
 *       404:
 *         description: Tournée introuvable
 */
router.get('/:id', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

  try {
    const [tournee] = await db.query(
      `SELECT t.id, t.date, t.chauffeur_id,
              c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom
       FROM tournees t
       JOIN chauffeurs c ON c.id = t.chauffeur_id
       WHERE t.id = ?`,
      [id]
    );

    if (tournee.length === 0) return res.status(404).json({ message: 'Tournée introuvable.' });

    // Un chauffeur ne peut voir que ses propres tournées
    if (req.user.role === 'chauffeur' && tournee[0].chauffeur_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    res.json(tournee[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /tournees/{id}/livraisons:
 *   get:
 *     summary: Obtenir toutes les livraisons d'une tournée
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des livraisons de la tournée
 *       404:
 *         description: Tournée introuvable
 */
router.get('/:id/livraisons', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

  try {
    const [tournee] = await db.query('SELECT id, chauffeur_id FROM tournees WHERE id = ?', [id]);
    if (tournee.length === 0) return res.status(404).json({ message: 'Tournée introuvable.' });

    if (req.user.role === 'chauffeur' && tournee[0].chauffeur_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const [livraisons] = await db.query(
      `SELECT l.id, l.heure_prevue, l.statut,
              cl.nom AS client_nom, cl.email AS client_email, cl.telephone AS client_telephone,
              a.rue, a.ville, a.code_postal, a.pays
       FROM livraisons l
       JOIN clients cl ON cl.id = l.client_id
       JOIN adresses a ON a.id = l.adresse_id
       WHERE l.tournee_id = ?
       ORDER BY l.heure_prevue ASC`,
      [id]
    );

    // Ajouter les marchandises pour chaque livraison
    for (const liv of livraisons) {
      const [marchandises] = await db.query(
        `SELECT m.id, m.nom, m.poids, m.volume, lm.quantite
         FROM livraison_marchandises lm
         JOIN marchandises m ON m.id = lm.marchandise_id
         WHERE lm.livraison_id = ?`,
        [liv.id]
      );
      liv.marchandises = marchandises;
    }

    res.json(livraisons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
