#!/bin/bash
set -eo pipefail
APP_NAME=$1
UPDATE_CACHE=""
#docker-compose -f docker/docker-compose.yml build $APP_NAME
docker build -f docker/ECSDockerfile -t $APP_NAME:latest .
docker create --name app $APP_NAME:latest

if [ -d node_modules ]
then
  mv package-lock.json old-package-lock.json
  docker cp app:/app/package-lock.json package-lock.json
  set +eo pipefail
  UPDATE_CACHE=$(cmp package-lock.json old-package-lock.json)
  set -eo pipefail
else
  UPDATE_CACHE=1
fi

if [ "$UPDATE_CACHE" == 1 ]
then
  docker cp app:/app/node_modules .
fi