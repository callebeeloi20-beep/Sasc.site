#!/bin/sh
cd "$(dirname "$0")"
while true; do
  node server.js
  echo "Servidor parou. Reiniciando em 3 segundos... (Ctrl+C para desligar)"
  sleep 3
done
