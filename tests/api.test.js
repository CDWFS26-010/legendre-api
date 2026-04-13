const request = require('supertest');
const app = require('../src/server');

let tokenAdmin = '';
let tokenChauffeur = '';
let tokenChauffeur2 = '';
let tokenClient = '';

// ─── AUTH ────────────────────────────────────────────────────────────────────
describe('🔐 AUTH — Authentification', () => {
  test('Login admin réussi → retourne un token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@legendre.fr', password: 'Test1234!' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toBe('admin');
    tokenAdmin = res.body.token;
  });

  test('Login chauffeur Pierre Martin réussi', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'p.martin@legendre.fr', password: 'Test1234!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('chauffeur');
    tokenChauffeur = res.body.token;
  });

  test('Login chauffeur Sophie Leroy réussi', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 's.leroy@legendre.fr', password: 'Test1234!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('chauffeur');
    tokenChauffeur2 = res.body.token;
  });

  test('Login client réussi', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'm.dupont@email.fr', password: 'Test1234!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('client');
    tokenClient = res.body.token;
  });

  test('Mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@legendre.fr', password: 'mauvais' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  test('Email inexistant → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'inconnu@test.fr', password: 'Test1234!' });
    expect(res.statusCode).toBe(401);
  });

  test('Email manquant → 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'Test1234!' });
    expect(res.statusCode).toBe(400);
  });

  test('Token invalide → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', 'Bearer token_bidon_invalide');
    expect(res.statusCode).toBe(403);
  });
});

// ─── CHAUFFEURS ───────────────────────────────────────────────────────────────
describe('🚛 CHAUFFEURS — Contrôle des rôles', () => {
  test('Admin peut lister tous les chauffeurs', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('Sans token → 401', async () => {
    const res = await request(app).get('/chauffeurs');
    expect(res.statusCode).toBe(401);
  });

  test('Chauffeur ne peut pas lister tous les chauffeurs → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });

  test('Client ne peut pas lister les chauffeurs → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(403);
  });

  test('Chauffeur peut voir ses propres infos', async () => {
    const res = await request(app)
      .get('/chauffeurs/00000000-0000-0000-0000-000000000002')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('p.martin@legendre.fr');
  });

  test('Chauffeur ne peut pas voir les infos d\'un autre chauffeur → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs/00000000-0000-0000-0000-000000000003')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });

  test('Chauffeur peut voir ses propres tournées', async () => {
    const res = await request(app)
      .get('/chauffeurs/00000000-0000-0000-0000-000000000002/tournees')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Chauffeur ne peut pas voir les tournées d\'un autre chauffeur → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs/00000000-0000-0000-0000-000000000003/tournees')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });
});

// ─── TOURNÉES ─────────────────────────────────────────────────────────────────
describe('📋 TOURNÉES — CRUD et rôles', () => {
  test('Admin peut lister toutes les tournées', async () => {
    const res = await request(app)
      .get('/tournees')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Chauffeur ne peut pas lister toutes les tournées → 403', async () => {
    const res = await request(app)
      .get('/tournees')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin peut créer une tournée', async () => {
    const res = await request(app)
      .post('/tournees')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ date: '2026-04-15', chauffeur_id: '00000000-0000-0000-0000-000000000002' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('Créer une tournée avec chauffeur inexistant → 404', async () => {
    const res = await request(app)
      .post('/tournees')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ date: '2026-04-15', chauffeur_id: '99999999-9999-9999-9999-999999999999' });
    expect(res.statusCode).toBe(404);
  });

  test('Créer une tournée sans date → 400', async () => {
    const res = await request(app)
      .post('/tournees')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ chauffeur_id: '00000000-0000-0000-0000-000000000002' });
    expect(res.statusCode).toBe(400);
  });

  test('Tournée spécifique avec infos chauffeur', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000030')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('chauffeur_nom');
  });

  test('Tournée inexistante → 404', async () => {
    const res = await request(app)
      .get('/tournees/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
  });

  test('Chauffeur accède à sa propre tournée', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000030')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(200);
  });

  test('Chauffeur ne peut pas accéder à la tournée d\'un autre chauffeur → 403', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000031')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });

  test('Livraisons d\'une tournée contiennent les marchandises', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000030/livraisons')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(liv => {
      expect(liv).toHaveProperty('marchandises');
      expect(liv).toHaveProperty('statut');
      expect(liv).toHaveProperty('client_nom');
    });
  });
});

// ─── LIVRAISONS ───────────────────────────────────────────────────────────────
describe('📦 LIVRAISONS — CRUD et rôles', () => {
  test('Admin peut créer une livraison', async () => {
    const res = await request(app)
      .post('/livraisons')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tournee_id: '00000000-0000-0000-0000-000000000030',
        client_id: '00000000-0000-0000-0000-000000000004',
        adresse_id: '00000000-0000-0000-0000-000000000010',
        heure_prevue: '2026-04-14T11:00:00'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('Créer une livraison sans champs obligatoires → 400', async () => {
    const res = await request(app)
      .post('/livraisons')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tournee_id: '00000000-0000-0000-0000-000000000030' });
    expect(res.statusCode).toBe(400);
  });

  test('Chauffeur met à jour le statut → en_cours', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenChauffeur}`)
      .send({ statut: 'en_cours' });
    expect(res.statusCode).toBe(200);
    expect(res.body.statut).toBe('en_cours');
  });

  test('Chauffeur met à jour le statut → livree', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenChauffeur}`)
      .send({ statut: 'livree' });
    expect(res.statusCode).toBe(200);
    expect(res.body.statut).toBe('livree');
  });

  test('Chauffeur2 ne peut pas modifier une livraison hors de sa tournée → 403', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenChauffeur2}`)
      .send({ statut: 'echec' });
    expect(res.statusCode).toBe(403);
  });

  test('Statut invalide → 400', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ statut: 'statut_inexistant' });
    expect(res.statusCode).toBe(400);
  });

  test('Client ne peut pas modifier le statut → 403', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ statut: 'livree' });
    expect(res.statusCode).toBe(403);
  });

  test('Client peut voir sa propre livraison', async () => {
    const res = await request(app)
      .get('/livraisons/00000000-0000-0000-0000-000000000040')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('statut');
    expect(res.body).toHaveProperty('marchandises');
  });

  test('Client ne peut pas voir la livraison d\'un autre client → 403', async () => {
    const res = await request(app)
      .get('/livraisons/00000000-0000-0000-0000-000000000041')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(403);
  });

  test('Livraison inexistante → 404', async () => {
    const res = await request(app)
      .get('/livraisons/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
  });
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
describe('👤 CLIENTS — Isolation des données', () => {
  test('Admin peut lister tous les clients', async () => {
    const res = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Chauffeur ne peut pas lister les clients → 403', async () => {
    const res = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(403);
  });

  test('Client peut voir ses propres infos', async () => {
    const res = await request(app)
      .get('/clients/00000000-0000-0000-0000-000000000004')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('nom');
  });

  test('Client ne peut pas voir les infos d\'un autre client → 403', async () => {
    const res = await request(app)
      .get('/clients/00000000-0000-0000-0000-000000000005')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(403);
  });

  test('Client peut voir ses propres livraisons', async () => {
    const res = await request(app)
      .get('/clients/00000000-0000-0000-0000-000000000004/livraisons')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Client ne peut pas voir les livraisons d\'un autre client → 403', async () => {
    const res = await request(app)
      .get('/clients/00000000-0000-0000-0000-000000000005/livraisons')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(403);
  });

  test('Client inexistant → 404', async () => {
    const res = await request(app)
      .get('/clients/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
  });
});

// ─── MARCHANDISES ─────────────────────────────────────────────────────────────
describe('🏷️ MARCHANDISES — CRUD', () => {
  test('Admin peut lister les marchandises', async () => {
    const res = await request(app)
      .get('/marchandises')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Chauffeur peut lister les marchandises', async () => {
    const res = await request(app)
      .get('/marchandises')
      .set('Authorization', `Bearer ${tokenChauffeur}`);
    expect(res.statusCode).toBe(200);
  });

  test('Client ne peut pas lister les marchandises → 403', async () => {
    const res = await request(app)
      .get('/marchandises')
      .set('Authorization', `Bearer ${tokenClient}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin peut créer une marchandise', async () => {
    const res = await request(app)
      .post('/marchandises')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nom: 'Colis test', poids: 10.5, volume: 0.5 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('Créer une marchandise sans nom → 400', async () => {
    const res = await request(app)
      .post('/marchandises')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ poids: 10.5 });
    expect(res.statusCode).toBe(400);
  });

  test('Marchandise inexistante → 404', async () => {
    const res = await request(app)
      .get('/marchandises/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
  });
});

// ─── Fermeture DB ─────────────────────────────────────────────────────────────
afterAll(async () => {
  const db = require('../src/config/db');
  await db.end();
});