FROM node:12

RUN apt-get -qq update && apt-get -qq install -y \
  wget git curl default-jdk

COPY . /app

WORKDIR /app

RUN rm -rf node_modules && npm install --unsafe-perm

ENTRYPOINT ["npm", "start"]
