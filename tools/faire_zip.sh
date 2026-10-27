#!/bin/sh
# Prépare le fichier .zip à envoyer sur l'hébergement Infomaniak (dossier /sites/gestion.dragonballdays.ch).
cd "$(dirname "$0")/.." || exit 1
rm -f dragon-ball-day-gestion.zip
zip -r dragon-ball-day-gestion.zip index.html manifest.webmanifest sw.js firebase-config.js icon-192.png icon-512.png apple-touch-icon.png css js img vendor -x '*.DS_Store'
echo "Prêt : dragon-ball-day-gestion.zip"
