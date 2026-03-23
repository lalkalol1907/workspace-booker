#!/bin/sh
set -e
# Только API_UPSTREAM — иначе envsubst ломает $host, $uri и т.д.
envsubst '${API_UPSTREAM}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
