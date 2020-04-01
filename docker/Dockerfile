FROM node:12
COPY . /app

WORKDIR /app

RUN rm -rf node_modules && npm install --unsafe-perm

ENTRYPOINT ["npm", "start"]
