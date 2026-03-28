#!/bin/sh
set -e
# Подставляем только нужные переменные, не трогая nginx $host/$uri.
envsubst '${API_UPSTREAM} ${PLATFORM_HOST} ${LANDING_HOST}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
