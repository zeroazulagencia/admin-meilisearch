-- Módulo 7: Backup BD a Dropbox (sincronizaciones diarias)
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_backup_7.sql

CREATE TABLE IF NOT EXISTS modulos_backup_7_config (
  config_key VARCHAR(100) NOT NULL PRIMARY KEY,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modulos_backup_7_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status ENUM('running','ok','error') NOT NULL DEFAULT 'running',
  file_name VARCHAR(255) NULL,
  dropbox_path VARCHAR(512) NULL,
  bytes_size INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claves: dropbox_access_token, dropbox_folder_path, cron_secret
INSERT IGNORE INTO modulos_backup_7_config (config_key, config_value) VALUES
  ('dropbox_folder_path', '/Aplicaciones/Zero Azul WORKERS'),
  ('cron_secret', NULL);

-- Token Dropbox (carpeta Aplicaciones/Zero Azul WORKERS)
INSERT IGNORE INTO modulos_backup_7_config (config_key, config_value) VALUES
  ('dropbox_access_token', 'sl.u.AGUmR86Z3mfgLqxgROb2gJ7ccHGR1o_N5oGG_vHXwrf4oJmECh_8FxOc8EWTVkU6yqObrOjx9Maxrtu-CTNUeizGKCkuI253fY3lvC8jm3vA4-IMXCUSRSy-jkf2HsuV47tV1fmbmalJuEUNP5WduzwfWvCswxWA916hDa1pAtECAFFlBPQBxGG6E6ayDKVNVxeI-Bn3ap9oxERAPFOmRVZ-6D-dby24mYcljcGXCdFk0kK0hnAj9OAjmv_mC-BH8Dk1rFYEGvQlGMQ_UrbKmNJdPRaovTyT-x_m0vo0n3RwgBBHu5Wt_uS70vLy99Rl9Eh8-DaYPDD_5t-Hn1Ft61e6T5aRnJAxOsH9PmfmOwu_A2hKQvK249gCgVanlGh1AkhlkrbFIonnHhW_-WNgkI9GzBi8VQ1dEIh9TAAfSruKZZID8UKP9t2PJ6HMkfDH6jJIdl3s_eF590915jq-TS6L5yiAeeXmoM5578wnAaToan6_Qsj42tnz_6hZEd4QZeTuC7NaiKXvmv8QuznL28O_k3PWasxkkk7Ml0hc_Z44h70gM35-w4KqTbJ0kV99Gy8rhK2zhZwHM_IJQruQgIxTF8_XN9Y9AFpJ-QtoL7N0Zp9lY_eDqtVO0uKrgD0qh8iDFVga83T1NuLNeAHGv2nxPSt2HGMk6Dxo6dS5vXAu7dqQO8_SXqhLzU7S9dUr7l4Id0dQQnaNcevIG99X7dQFVkgHqgSaRws3hhqMCF_y_NGw5R42R99vHo00ymV8m3Cl0NGHiyn4-_LUonb0120MN0ro59b4HhYOvabolFJmr2_f7mJQGmbZnw5x0tzA_NN-YucibQMj2xs9m7as8VbTpaVwF5V-1lkCivVUzFZJl8p-LUe8aSkendvuleswg8Q2mjGDgtOxnUv_rPYH9npJujR0x1HY9BzIAaQRCo-aVR4DmdHnOMdN0ennXjwe2CGmxXtsMnR2NWGrNTAP-xtDokF3apF6UKWUmy-hUQWl50V-X47OT-1Ce6kmwY6b4eYmdvugsnFuB3vBUYSNpr7IEqYNbY3LZ-tPV-ju-q_e0gEGwrY9NdPoyhibX7iNLSpdmuRCOizuBQmD5ou6CrO2JtI1C180Iu1Xl7oHhgC84B14Cz56ATbUsFva13Tot2LCRSyk5zfn_7h68oc2nmbnKdTpVwl7OEKl3Da6kkFztwd31X1gkFiVYZdIPb58bJr5_d98aUOGhi7tClNH7d7nXWOMhP4m6thrrRu6av_so9kEkRKbTzsXsnCyB4uqs00yzNXoiRNXJtK80e48Tos9TrwhrbgziBdwuFqkUikRsBM9O85B4V0pVO_9pJCl5s3Vh7AJTW2xP0_BF58ULEex0gbInOBSwu9EgHqjGiazoVMml5nCzLS6K63lGU4tB7IWCJdLwaXRcLoyKSkIZQ5QK5uWwyaPLKJtpmEpF6Z3Wg');
