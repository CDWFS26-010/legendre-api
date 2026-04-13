/**
 * Script de seed — Entreprise LEGENDRE
 * Génère les hash bcrypt et insère les comptes de test en base.
 *
 * Usage : node seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

const SALT_ROUNDS = 12;
const MOT_DE_PASSE = 'Test1234!';

async function seed() {
  console.log('🌱 Démarrage du seed...\n');

  try {
    const hash = await bcrypt.hash(MOT_DE_PASSE, SALT_ROUNDS);
    console.log('🔐 Hash bcrypt généré');

    await db.query('UPDATE utilisateurs SET password = ?', [hash]);
    console.log('✅ Mots de passe mis à jour pour tous les comptes\n');

    console.log('📋 Comptes disponibles :');
    console.log('─────────────────────────────────────────────────');
    console.log('Rôle      │ Email                 │ Mot de passe');
    console.log('─────────────────────────────────────────────────');
    console.log('admin     │ admin@legendre.fr     │ Test1234!');
    console.log('chauffeur │ p.martin@legendre.fr  │ Test1234!');
    console.log('chauffeur │ s.leroy@legendre.fr   │ Test1234!');
    console.log('client    │ m.dupont@email.fr     │ Test1234!');
    console.log('client    │ a.bernard@email.fr    │ Test1234!');
    console.log('─────────────────────────────────────────────────\n');
    console.log('🚀 Seed terminé ! Vous pouvez lancer : npm run dev');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors du seed :', err.message);
    process.exit(1);
  }
}

seed();