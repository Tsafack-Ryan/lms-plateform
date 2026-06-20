CREATE DATABASE IF NOT EXISTS lms_plateforme CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lms_plateforme;

DROP TABLE IF EXISTS options_examen_final;

DROP TABLE IF EXISTS options_evaluation;

DROP TABLE IF EXISTS examens_finaux;

DROP TABLE IF EXISTS evaluations;

DROP TABLE IF EXISTS progressions;

DROP TABLE IF EXISTS inscriptions;

DROP TABLE IF EXISTS lecons;

DROP TABLE IF EXISTS chapitres;

DROP TABLE IF EXISTS cours;

DROP TABLE IF EXISTS modules;

DROP TABLE IF EXISTS certificats;

DROP TABLE IF EXISTS utilisateurs;

CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM(
        'etudiant',
        'enseignant',
        'promoteur'
    ) NOT NULL DEFAULT 'etudiant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    titre VARCHAR(160) NOT NULL,
    description TEXT NULL
);

CREATE TABLE cours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    enseignant_id INT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE,
    FOREIGN KEY (enseignant_id) REFERENCES utilisateurs (id) ON DELETE CASCADE
);

CREATE TABLE chapitres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cours_id INT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    ordre INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cours_id) REFERENCES cours (id) ON DELETE CASCADE
);

CREATE TABLE lecons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chapitre_id INT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    type_contenu ENUM('pdf', 'video') NOT NULL,
    chemin_fichier VARCHAR(255) NULL,
    ordre INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapitre_id) REFERENCES chapitres (id) ON DELETE CASCADE
);

CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecon_id INT NOT NULL,
    question TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecon_id) REFERENCES lecons (id) ON DELETE CASCADE
);

CREATE TABLE options_evaluation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    code_option CHAR(1) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    est_correcte TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
);

CREATE TABLE examens_finaux (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cours_id INT NOT NULL,
    question TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cours_id) REFERENCES cours (id) ON DELETE CASCADE
);

CREATE TABLE options_examen_final (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examen_id INT NOT NULL,
    code_option CHAR(1) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    est_correcte TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (examen_id) REFERENCES examens_finaux (id) ON DELETE CASCADE
);

CREATE TABLE inscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    etudiant_id INT NOT NULL,
    cours_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_inscription (etudiant_id, cours_id),
    FOREIGN KEY (etudiant_id) REFERENCES utilisateurs (id) ON DELETE CASCADE,
    FOREIGN KEY (cours_id) REFERENCES cours (id) ON DELETE CASCADE
);

CREATE TABLE progressions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    etudiant_id INT NOT NULL,
    lecon_id INT NOT NULL,
    note DECIMAL(5, 2) NOT NULL DEFAULT 0,
    statut ENUM('en_cours', 'terminee') NOT NULL DEFAULT 'en_cours',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_progression (etudiant_id, lecon_id),
    FOREIGN KEY (etudiant_id) REFERENCES utilisateurs (id) ON DELETE CASCADE,
    FOREIGN KEY (lecon_id) REFERENCES lecons (id) ON DELETE CASCADE
);

CREATE TABLE certificats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    etudiant_id INT NOT NULL,
    cours_id INT NOT NULL,
    code_certificat VARCHAR(80) NOT NULL UNIQUE,
    date_obtention TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (etudiant_id) REFERENCES utilisateurs (id) ON DELETE CASCADE,
    FOREIGN KEY (cours_id) REFERENCES cours (id) ON DELETE CASCADE
);

-- Index pour les performances des requetes frequentes
CREATE INDEX idx_cours_enseignant ON cours (enseignant_id);

CREATE INDEX idx_cours_module ON cours (module_id);

CREATE INDEX idx_chapitres_cours ON chapitres (cours_id);

CREATE INDEX idx_lecons_chapitre ON lecons (chapitre_id);

CREATE INDEX idx_evaluations_lecon ON evaluations (lecon_id);

CREATE INDEX idx_examens_cours ON examens_finaux (cours_id);

CREATE INDEX idx_progressions_etudiant ON progressions (etudiant_id);

CREATE INDEX idx_inscriptions_etudiant ON inscriptions (etudiant_id);

CREATE INDEX idx_utilisateurs_email ON utilisateurs (email);

-- Donnees initiales des modules
INSERT IGNORE INTO
    modules (code, titre, description)
VALUES (
        'html-css',
        'HTML & CSS',
        'Bases de la structure HTML et du style CSS.'
    ),
    (
        'javascript',
        'JavaScript',
        'Interactions cote client et logique du navigateur.'
    ),
    (
        'php-mysql',
        'PHP & MySQL',
        'Developpement serveur et persistance des donnees.'
    );