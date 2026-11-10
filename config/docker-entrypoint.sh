#!/bin/sh
set -eu
cd /app
node bootstrap.cjs
exec env HOSTNAME=0.0.0.0 node server.js
