-- ============================================================
-- Script SQL - API Logistique LEGENDRE
-- Base de données : MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS legendre_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE legendre_db;

-- ─── Table utilisateurs (authentification) ───────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  prenom      VARCHAR(100),
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  telephone   VARCHAR(20),
  role        ENUM('admin', 'chauffeur', 'client') NOT NULL DEFAULT 'client',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Table chauffeurs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chauffeurs (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  prenom      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  telephone   VARCHAR(20),
  CONSTRAINT fk_chauffeur_user FOREIGN KEY (id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- ─── Table clients ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  telephone   VARCHAR(20),
  CONSTRAINT fk_client_user FOREIGN KEY (id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- ─── Table adresses ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adresses (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  rue         VARCHAR(255) NOT NULL,
  ville       VARCHAR(100) NOT NULL,
  code_postal VARCHAR(10)  NOT NULL,
  pays        VARCHAR(100) NOT NULL DEFAULT 'France'
);

-- ─── Table marchandises ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS marchandises (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  nom         VARCHAR(150) NOT NULL,
  poids       FLOAT,
  volume      FLOAT
);

-- ─── Table tournées ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournees (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  date         DATE     NOT NULL,
  chauffeur_id CHAR(36) NOT NULL,
  CONSTRAINT fk_tournee_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES chauffeurs(id) ON DELETE RESTRICT
);

-- ─── Table livraisons ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS livraisons (
  id           CHAR(36)  NOT NULL PRIMARY KEY,
  heure_prevue DATETIME,
  statut       ENUM('en_attente', 'en_cours', 'livree', 'echec') NOT NULL DEFAULT 'en_attente',
  tournee_id   CHAR(36)  NOT NULL,
  client_id    CHAR(36)  NOT NULL,
  adresse_id   CHAR(36)  NOT NULL,
  CONSTRAINT fk_livraison_tournee  FOREIGN KEY (tournee_id)  REFERENCES tournees(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_livraison_client   FOREIGN KEY (client_id)   REFERENCES clients(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_livraison_adresse  FOREIGN KEY (adresse_id)  REFERENCES adresses(id)    ON DELETE RESTRICT
);

-- ─── Table livraison_marchandises (table de jonction) ────────
CREATE TABLE IF NOT EXISTS livraison_marchandises (
  livraison_id    CHAR(36) NOT NULL,
  marchandise_id  CHAR(36) NOT NULL,
  quantite        INT      NOT NULL DEFAULT 1,
  PRIMARY KEY (livraison_id, marchandise_id),
  CONSTRAINT fk_lm_livraison    FOREIGN KEY (livraison_id)   REFERENCES livraisons(id)    ON DELETE CASCADE,
  CONSTRAINT fk_lm_marchandise  FOREIGN KEY (marchandise_id) REFERENCES marchandises(id)  ON DELETE RESTRICT
);

-- ============================================================
-- DONNÉES DE TEST (seed)
-- Mot de passe de tous les comptes : Test1234!
-- Hash bcrypt de "Test1234!" avec salt=12
-- ============================================================

-- Admin
INSERT INTO utilisateurs (id, nom, prenom, email, password, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin', 'LEGENDRE', 'admin@legendre.fr',
 '$2a$12$K8GpYbVXc4Q1o.K3L9JZ7.YpAqC7mT8rN6wE5lF2hD0qS9uV3xO6.',
 'admin');

-- Chauffeurs
INSERT INTO utilisateurs (id, nom, prenom, email, password, telephone, role) VALUES
('00000000-0000-0000-0000-000000000002', 'Martin', 'Pierre', 'p.martin@legendre.fr',
 '$2a$12$K8GpYbVXc4Q1o.K3L9JZ7.YpAqC7mT8rN6wE5lF2hD0qS9uV3xO6.',
 '0611223344', 'chauffeur'),
('00000000-0000-0000-0000-000000000003', 'Leroy', 'Sophie', 's.leroy@legendre.fr',
 '$2a$12$K8GpYbVXc4Q1o.K3L9JZ7.YpAqC7mT8rN6wE5lF2hD0qS9uV3xO6.',
 '0622334455', 'chauffeur');

INSERT INTO chauffeurs (id, nom, prenom, email, telephone) VALUES
('00000000-0000-0000-0000-000000000002', 'Martin', 'Pierre', 'p.martin@legendre.fr', '0611223344'),
('00000000-0000-0000-0000-000000000003', 'Leroy', 'Sophie', 's.leroy@legendre.fr', '0622334455');

-- Clients
INSERT INTO utilisateurs (id, nom, prenom, email, password, telephone, role) VALUES
('00000000-0000-0000-0000-000000000004', 'Dupont', 'Marc', 'm.dupont@email.fr',
 '$2a$12$K8GpYbVXc4Q1o.K3L9JZ7.YpAqC7mT8rN6wE5lF2hD0qS9uV3xO6.',
 '0633445566', 'client'),
('00000000-0000-0000-0000-000000000005', 'Bernard', 'Alice', 'a.bernard@email.fr',
 '$2a$12$K8GpYbVXc4Q1o.K3L9JZ7.YpAqC7mT8rN6wE5lF2hD0qS9uV3xO6.',
 '0644556677', 'client');

INSERT INTO clients (id, nom, email, telephone) VALUES
('00000000-0000-0000-0000-000000000004', 'Dupont Marc', 'm.dupont@email.fr', '0633445566'),
('00000000-0000-0000-0000-000000000005', 'Bernard Alice', 'a.bernard@email.fr', '0644556677');

-- Adresses
INSERT INTO adresses (id, rue, ville, code_postal, pays) VALUES
('00000000-0000-0000-0000-000000000010', '12 rue de la Paix', 'Chartres', '28000', 'France'),
('00000000-0000-0000-0000-000000000011', '5 avenue Victor Hugo', 'Dreux', '28100', 'France'),
('00000000-0000-0000-0000-000000000012', '8 impasse du Moulin', 'Châteaudun', '28200', 'France');

-- Marchandises
INSERT INTO marchandises (id, nom, poids, volume) VALUES
('00000000-0000-0000-0000-000000000020', 'Palette de colis', 150.0, 2.5),
('00000000-0000-0000-0000-000000000021', 'Carton standard', 12.5, 0.08),
('00000000-0000-0000-0000-000000000022', 'Colis fragile', 5.0, 0.03);

-- Tournées
INSERT INTO tournees (id, date, chauffeur_id) VALUES
('00000000-0000-0000-0000-000000000030', '2026-04-14', '00000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000031', '2026-04-14', '00000000-0000-0000-0000-000000000003');

-- Livraisons
INSERT INTO livraisons (id, heure_prevue, statut, tournee_id, client_id, adresse_id) VALUES
('00000000-0000-0000-0000-000000000040', '2026-04-14 09:00:00', 'en_attente',
 '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010'),
('00000000-0000-0000-0000-000000000041', '2026-04-14 10:30:00', 'en_attente',
 '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000011'),
('00000000-0000-0000-0000-000000000042', '2026-04-14 14:00:00', 'en_attente',
 '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012');

-- Livraison_marchandises
INSERT INTO livraison_marchandises (livraison_id, marchandise_id, quantite) VALUES
('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000020', 1),
('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000021', 3),
('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000022', 2),
('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000021', 5);
