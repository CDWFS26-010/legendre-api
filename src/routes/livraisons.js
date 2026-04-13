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
 *     description: |
 *       Retourne toutes les livraisons avec le nom du client, l'adresse et la date de tournée.
 *
 *       ➡️ **Cas d'usage** : L'administrateur consulte le suivi global de toutes les livraisons en cours.
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les livraisons
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000040
 *                 heure_prevue: "2026-04-14T09:00:00.000Z"
 *                 statut: livree
 *                 client_nom: Dupont Marc
 *                 rue: 12 rue de la Paix
 *                 ville: Chartres
 *                 date_tournee: "2026-04-14"
 *               - id: 00000000-0000-0000-0000-000000000041
 *                 heure_prevue: "2026-04-14T10:30:00.000Z"
 *                 statut: en_cours
 *                 client_nom: Bernard Alice
 *                 rue: 5 avenue Victor Hugo
 *                 ville: Dreux
 *                 date_tournee: "2026-04-14"
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
 *     description: |
 *       Retourne tous les détails d'une livraison : client, adresse, statut et marchandises.
 *
 *       ➡️ **Cas d'usage client** : Marc Dupont se connecte pour suivre l'état de sa livraison et voir à quelle heure elle est prévue.
 *
 *       ➡️ **Cas d'usage chauffeur** : Pierre Martin consulte le détail d'une livraison spécifique pour vérifier les marchandises avant de sonner chez le client.
 *
 *       🔒 **Accès** : Admin (toutes) / Chauffeur (livraisons de ses tournées) / Client (ses propres livraisons uniquement).
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000040
 *     responses:
 *       200:
 *         description: Détail complet de la livraison
 *         content:
 *           application/json:
 *             example:
 *               id: 00000000-0000-0000-0000-000000000040
 *               heure_prevue: "2026-04-14T09:00:00.000Z"
 *               statut: en_cours
 *               client_nom: Dupont Marc
 *               client_email: m.dupont@email.fr
 *               client_telephone: "0633445566"
 *               rue: 12 rue de la Paix
 *               ville: Chartres
 *               code_postal: "28000"
 *               pays: France
 *               marchandises:
 *                 - id: 00000000-0000-0000-0000-000000000020
 *                   nom: Palette de colis
 *                   poids: 150
 *                   volume: 2.5
 *                   quantite: 1
 *       403:
 *         description: Client tente de voir la livraison d'un autre client
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Livraison introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Livraison introuvable.
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

    if (req.user.role === 'client' && livraison.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

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
 *     description: |
 *       Ajoute une livraison à une tournée existante pour un client et une adresse donnés.
 *
 *       ➡️ **Cas d'usage** : L'administrateur ajoute une livraison urgente à la tournée de Pierre Martin après validation d'une commande client.
 *
 *       🔒 **Accès** : Admin uniquement.
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
 *               heure_prevue: { type: string, format: date-time }
 *           example:
 *             tournee_id: 00000000-0000-0000-0000-000000000030
 *             client_id: 00000000-0000-0000-0000-000000000004
 *             adresse_id: 00000000-0000-0000-0000-000000000010
 *             heure_prevue: "2026-04-14T11:00:00"
 *     responses:
 *       201:
 *         description: Livraison créée avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: Livraison créée.
 *               id: c3d4e5f6-a7b8-9012-cdef-123456789012
 *       400:
 *         description: Champs obligatoires manquants
 *         content:
 *           application/json:
 *             example:
 *               message: tournee_id, client_id et adresse_id sont obligatoires.
 *       404:
 *         description: Tournée, client ou adresse introuvable
 *         content:
 *           application/json:
 *             examples:
 *               Tournée introuvable:
 *                 value:
 *                   message: Tournée introuvable.
 *               Client introuvable:
 *                 value:
 *                   message: Client introuvable.
 *               Adresse introuvable:
 *                 value:
 *                   message: Adresse introuvable.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { tournee_id, client_id, adresse_id, heure_prevue } = req.body;

  if (!tournee_id || !client_id || !adresse_id) {
    return res.status(400).json({ message: 'tournee_id, client_id et adresse_id sont obligatoires.' });
  }

  try {
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
 *     description: |
 *       Met à jour le statut d'une livraison selon sa progression.
 *
 *       **Cycle de vie d'une livraison :**
 *       ```
 *       en_attente → en_cours → livree
 *                            ↘ echec
 *       ```
 *
 *       ➡️ **Cas d'usage 1** : Pierre Martin arrive chez le client → il passe le statut à `en_cours`.
 *
 *       ➡️ **Cas d'usage 2** : La livraison est faite → il passe le statut à `livree`.
 *
 *       ➡️ **Cas d'usage 3** : Personne n'est présent chez le client → il passe le statut à `echec`.
 *
 *       🔒 **Accès** : Admin ou Chauffeur (uniquement les livraisons de ses propres tournées).
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         example: 00000000-0000-0000-0000-000000000040
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
 *           examples:
 *             Démarrer la livraison:
 *               value:
 *                 statut: en_cours
 *             Livraison réussie:
 *               value:
 *                 statut: livree
 *             Livraison échouée:
 *               value:
 *                 statut: echec
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: Statut mis à jour.
 *               statut: livree
 *       400:
 *         description: Statut invalide
 *         content:
 *           application/json:
 *             example:
 *               message: "Statut invalide. Valeurs acceptées : en_attente, en_cours, livree, echec."
 *       403:
 *         description: Chauffeur tente de modifier une livraison hors de sa tournée
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Livraison introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Livraison introuvable.
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