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
 *     description: |
 *       Retourne toutes les tournées avec le nom du chauffeur et le nombre de livraisons associées.
 *
 *       ➡️ **Cas d'usage** : L'administrateur consulte le tableau de bord pour avoir une vue d'ensemble de toutes les tournées du jour.
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les tournées
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000030
 *                 date: "2026-04-14"
 *                 chauffeur_nom: Martin
 *                 chauffeur_prenom: Pierre
 *                 nb_livraisons: 2
 *               - id: 00000000-0000-0000-0000-000000000031
 *                 date: "2026-04-14"
 *                 chauffeur_nom: Leroy
 *                 chauffeur_prenom: Sophie
 *                 nb_livraisons: 1
 *       403:
 *         description: Accès refusé
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé. Permissions insuffisantes.
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
 *     description: |
 *       Crée une tournée pour un chauffeur à une date donnée.
 *
 *       ➡️ **Cas d'usage** : Chaque soir, l'administrateur prépare les tournées du lendemain en assignant chaque chauffeur à une tournée.
 *
 *       🔒 **Accès** : Admin uniquement.
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
 *               date: { type: string, format: date }
 *               chauffeur_id: { type: string, format: uuid }
 *           example:
 *             date: "2026-04-15"
 *             chauffeur_id: 00000000-0000-0000-0000-000000000002
 *     responses:
 *       201:
 *         description: Tournée créée avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: Tournée créée.
 *               id: b2c3d4e5-f6a7-8901-bcde-f12345678901
 *       400:
 *         description: Données manquantes
 *         content:
 *           application/json:
 *             example:
 *               message: date et chauffeur_id sont obligatoires.
 *       404:
 *         description: Chauffeur introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Chauffeur introuvable.
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
 *     summary: Obtenir une tournée par son ID
 *     description: |
 *       Retourne les détails d'une tournée avec les informations du chauffeur assigné.
 *
 *       ➡️ **Cas d'usage** : Pierre Martin consulte les détails de sa tournée du jour avant de partir.
 *
 *       🔒 **Accès** : Admin (toutes les tournées) ou Chauffeur (sa propre tournée uniquement).
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000030
 *     responses:
 *       200:
 *         description: Détails de la tournée
 *         content:
 *           application/json:
 *             example:
 *               id: 00000000-0000-0000-0000-000000000030
 *               date: "2026-04-14"
 *               chauffeur_id: 00000000-0000-0000-0000-000000000002
 *               chauffeur_nom: Martin
 *               chauffeur_prenom: Pierre
 *       403:
 *         description: Chauffeur tente d'accéder à la tournée d'un autre chauffeur
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Tournée introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Tournée introuvable.
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
 *     description: |
 *       Retourne la liste complète des livraisons d'une tournée, avec pour chaque livraison :
 *       les informations client, l'adresse de livraison, l'heure prévue, le statut et les marchandises à livrer.
 *
 *       ➡️ **Cas d'usage principal** : C'est la route la plus importante pour un chauffeur. Chaque matin, Pierre Martin consulte sa tournée pour voir toutes ses livraisons du jour dans l'ordre, avec les adresses et les colis à livrer.
 *
 *       ➡️ **Cas d'usage système tiers** : Un WMS ou ERP récupère automatiquement les données de livraison pour les intégrer dans son système de suivi.
 *
 *       🔒 **Accès** : Admin (toutes les tournées) ou Chauffeur (sa propre tournée uniquement).
 *     tags: [Tournées]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000030
 *     responses:
 *       200:
 *         description: Liste des livraisons avec clients, adresses et marchandises
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000040
 *                 heure_prevue: "2026-04-14T09:00:00.000Z"
 *                 statut: en_attente
 *                 client_nom: Dupont Marc
 *                 client_email: m.dupont@email.fr
 *                 client_telephone: "0633445566"
 *                 rue: 12 rue de la Paix
 *                 ville: Chartres
 *                 code_postal: "28000"
 *                 pays: France
 *                 marchandises:
 *                   - id: 00000000-0000-0000-0000-000000000020
 *                     nom: Palette de colis
 *                     poids: 150
 *                     volume: 2.5
 *                     quantite: 1
 *                   - id: 00000000-0000-0000-0000-000000000021
 *                     nom: Carton standard
 *                     poids: 12.5
 *                     volume: 0.08
 *                     quantite: 3
 *               - id: 00000000-0000-0000-0000-000000000041
 *                 heure_prevue: "2026-04-14T10:30:00.000Z"
 *                 statut: en_attente
 *                 client_nom: Bernard Alice
 *                 client_email: a.bernard@email.fr
 *                 client_telephone: "0644556677"
 *                 rue: 5 avenue Victor Hugo
 *                 ville: Dreux
 *                 code_postal: "28100"
 *                 pays: France
 *                 marchandises:
 *                   - id: 00000000-0000-0000-0000-000000000022
 *                     nom: Colis fragile
 *                     poids: 5
 *                     volume: 0.03
 *                     quantite: 2
 *       403:
 *         description: Chauffeur tente d'accéder à la tournée d'un autre chauffeur
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Tournée introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Tournée introuvable.
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