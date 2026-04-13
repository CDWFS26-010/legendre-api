const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Lister tous les clients
 *     description: |
 *       Retourne la liste complète des clients de l'entreprise.
 *
 *       ➡️ **Cas d'usage** : L'administrateur consulte la liste des clients pour créer une nouvelle livraison.
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des clients
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000004
 *                 nom: Dupont Marc
 *                 email: m.dupont@email.fr
 *                 telephone: "0633445566"
 *               - id: 00000000-0000-0000-0000-000000000005
 *                 nom: Bernard Alice
 *                 email: a.bernard@email.fr
 *                 telephone: "0644556677"
 *       403:
 *         description: Accès refusé
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé. Permissions insuffisantes.
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
 *     description: |
 *       Retourne les informations d'un client spécifique.
 *
 *       ➡️ **Cas d'usage client** : Marc Dupont consulte son propre profil pour vérifier ses coordonnées enregistrées.
 *
 *       ➡️ **Cas d'usage admin** : L'administrateur consulte les infos d'un client pour vérifier son adresse avant une livraison.
 *
 *       🔒 **Accès** : Admin (tous les clients) ou Client (ses propres infos uniquement).
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000004
 *     responses:
 *       200:
 *         description: Informations du client
 *         content:
 *           application/json:
 *             example:
 *               id: 00000000-0000-0000-0000-000000000004
 *               nom: Dupont Marc
 *               email: m.dupont@email.fr
 *               telephone: "0633445566"
 *       403:
 *         description: Un client tente de voir les infos d'un autre client
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Client introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Client introuvable.
 */
router.get('/:id', authenticate, authorize('admin', 'client'), async (req, res) => {
  const { id } = req.params;

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
 *     description: |
 *       Retourne toutes les livraisons d'un client avec l'adresse, le statut et la date de tournée.
 *
 *       ➡️ **Cas d'usage principal** : Marc Dupont se connecte à l'application cliente pour suivre toutes ses livraisons en cours et passées. Il peut voir si son colis est en attente, en cours de livraison ou déjà livré.
 *
 *       🔒 **Accès** : Admin (tous les clients) ou Client (ses propres livraisons uniquement).
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000004
 *     responses:
 *       200:
 *         description: Liste des livraisons du client
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000040
 *                 heure_prevue: "2026-04-14T09:00:00.000Z"
 *                 statut: livree
 *                 rue: 12 rue de la Paix
 *                 ville: Chartres
 *                 code_postal: "28000"
 *                 date_tournee: "2026-04-14"
 *               - id: 00000000-0000-0000-0000-000000000042
 *                 heure_prevue: "2026-04-14T14:00:00.000Z"
 *                 statut: en_attente
 *                 rue: 8 impasse du Moulin
 *                 ville: Châteaudun
 *                 code_postal: "28200"
 *                 date_tournee: "2026-04-14"
 *       403:
 *         description: Un client tente de voir les livraisons d'un autre client
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Client introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Client introuvable.
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