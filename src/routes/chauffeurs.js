const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /chauffeurs:
 *   get:
 *     summary: Lister tous les chauffeurs
 *     description: |
 *       Retourne la liste complète des chauffeurs de l'entreprise.
 *
 *       ➡️ **Cas d'usage** : L'administrateur consulte la liste des chauffeurs pour attribuer une nouvelle tournée.
 *
 *       🔒 **Accès** : Admin uniquement.
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des chauffeurs retournée avec succès
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000002
 *                 nom: Martin
 *                 prenom: Pierre
 *                 email: p.martin@legendre.fr
 *                 telephone: "0611223344"
 *               - id: 00000000-0000-0000-0000-000000000003
 *                 nom: Leroy
 *                 prenom: Sophie
 *                 email: s.leroy@legendre.fr
 *                 telephone: "0622334455"
 *       401:
 *         description: Token manquant
 *         content:
 *           application/json:
 *             example:
 *               message: Token manquant. Authentification requise.
 *       403:
 *         description: Accès refusé — rôle insuffisant
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé. Permissions insuffisantes.
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
 *     description: |
 *       Retourne les informations d'un chauffeur spécifique.
 *
 *       ➡️ **Cas d'usage chauffeur** : Pierre Martin consulte son propre profil depuis l'application mobile.
 *
 *       ➡️ **Cas d'usage admin** : L'administrateur vérifie les coordonnées d'un chauffeur.
 *
 *       🔒 **Accès** : Admin (tous les chauffeurs) ou Chauffeur (ses propres infos uniquement).
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID du chauffeur
 *         example: 00000000-0000-0000-0000-000000000002
 *     responses:
 *       200:
 *         description: Informations du chauffeur
 *         content:
 *           application/json:
 *             example:
 *               id: 00000000-0000-0000-0000-000000000002
 *               nom: Martin
 *               prenom: Pierre
 *               email: p.martin@legendre.fr
 *               telephone: "0611223344"
 *       403:
 *         description: Un chauffeur tente de voir les infos d'un autre chauffeur
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Chauffeur introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Chauffeur introuvable.
 */
router.get('/:id', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

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
 *     description: |
 *       Retourne toutes les tournées assignées à un chauffeur, avec le nombre de livraisons par tournée.
 *
 *       ➡️ **Cas d'usage principal** : Chaque matin, Pierre Martin ouvre son application mobile et consulte ses tournées pour savoir combien de livraisons il a aujourd'hui.
 *
 *       🔒 **Accès** : Admin (tous les chauffeurs) ou Chauffeur (ses propres tournées uniquement).
 *     tags: [Chauffeurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID du chauffeur
 *         example: 00000000-0000-0000-0000-000000000002
 *     responses:
 *       200:
 *         description: Liste des tournées du chauffeur avec nombre de livraisons
 *         content:
 *           application/json:
 *             example:
 *               - id: 00000000-0000-0000-0000-000000000030
 *                 date: "2026-04-14"
 *                 nb_livraisons: 2
 *               - id: 00000000-0000-0000-0000-000000000033
 *                 date: "2026-04-13"
 *                 nb_livraisons: 3
 *       403:
 *         description: Un chauffeur tente de voir les tournées d'un autre chauffeur
 *         content:
 *           application/json:
 *             example:
 *               message: Accès refusé.
 *       404:
 *         description: Chauffeur introuvable
 *         content:
 *           application/json:
 *             example:
 *               message: Chauffeur introuvable.
 */
router.get('/:id/tournees', authenticate, authorize('admin', 'chauffeur'), async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'chauffeur' && req.user.id !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  try {
    const [chauffeur] = await db.query('SELECT id FROM chauffeurs WHERE id = ?', [id]);
    if (chauffeur.length === 0) return res.status(404).json({ message: 'Chauffeur introuvable.' });

    const [rows] = await db.query(
      `SELECT t.id, t.date, COUNT(l.id) as nb_livraisons
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