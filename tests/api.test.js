const request = require('supertest');
const app = require('../src/server');

// Token admin obtenu après login (on les récupère dynamiquement dans les tests)
let tokenAdmin = '';
let tokenChauffeur = '';
let tokenClient = '';

// ─── AUTH ────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  test('Login admin réussi → retourne un token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@legendre.fr', password: 'Test1234!' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toBe('admin');
    tokenAdmin = res.body.token;
  });

  test('Login chauffeur réussi', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'p.martin@legendre.fr', password: 'Test1234!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('chauffeur');
    tokenChauffeur = res.body.token;
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

  test('Email manquant → 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'Test1234!' });

    expect(res.statusCode).toBe(400);
  });
});

// ─── CHAUFFEURS ───────────────────────────────────────────────────────────────
describe('GET /chauffeurs', () => {
  test('Admin peut lister les chauffeurs', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Sans token → 401', async () => {
    const res = await request(app).get('/chauffeurs');
    expect(res.statusCode).toBe(401);
  });

  test('Client ne peut pas lister les chauffeurs → 403', async () => {
    const res = await request(app)
      .get('/chauffeurs')
      .set('Authorization', `Bearer ${tokenClient}`);

    expect(res.statusCode).toBe(403);
  });
});

// ─── TOURNÉES ─────────────────────────────────────────────────────────────────
describe('GET /tournees', () => {
  test('Admin peut lister les tournées', async () => {
    const res = await request(app)
      .get('/tournees')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Tournée spécifique accessible à l\'admin', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000030')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('date');
  });

  test('Tournée inexistante → 404', async () => {
    const res = await request(app)
      .get('/tournees/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(404);
  });

  test('Livraisons d\'une tournée', async () => {
    const res = await request(app)
      .get('/tournees/00000000-0000-0000-0000-000000000030/livraisons')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Chaque livraison doit avoir ses marchandises
    res.body.forEach(liv => {
      expect(liv).toHaveProperty('marchandises');
    });
  });
});

// ─── LIVRAISONS ───────────────────────────────────────────────────────────────
describe('PATCH /livraisons/:id/statut', () => {
  test('Chauffeur peut mettre à jour le statut d\'une livraison de sa tournée', async () => {
    const res = await request(app)
      .patch('/livraisons/00000000-0000-0000-0000-000000000040/statut')
      .set('Authorization', `Bearer ${tokenChauffeur}`)
      .send({ statut: 'en_cours' });

    expect(res.statusCode).toBe(200);
    expect(res.body.statut).toBe('en_cours');
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
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
describe('GET /clients', () => {
  test('Admin peut lister les clients', async () => {
    const res = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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
});

// ─── MARCHANDISES ─────────────────────────────────────────────────────────────
describe('GET /marchandises', () => {
  test('Admin peut lister les marchandises', async () => {
    const res = await request(app)
      .get('/marchandises')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Marchandise inexistante → 404', async () => {
    const res = await request(app)
      .get('/marchandises/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(404);
  });
});

// Fermer la connexion DB après les tests
afterAll(async () => {
  const db = require('../src/config/db');
  await db.end();
});
