# Topcoder - Legacy Challenge Processor

## Dependencies

- nodejs https://nodejs.org/en/ (v10+)
- Kafka

## Configuration

Configuration for the legacy groups processor is at `config/default.js`.
The following parameters can be set in config files or in env variables:
- LOG_LEVEL: the log level; default value: 'debug'
- KAFKA_URL: comma separated Kafka hosts; default value: 'localhost:9092'
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- KAFKA_GROUP_ID: the Kafka group id, default value is 'legacy-challenge-processor'
- CREATE_CHALLENGE_TOPIC: the create challenge Kafka message topic, default value is 'challenge.notification.create'
- UPDATE_CHALLENGE_TOPIC: the update challenge Kafka message topic, default value is 'challenge.notification.update'
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- AUTH0_PROXY_SERVER_URL: Proxy Auth0 URL, used to get TC M2M token
- V4_CHALLENGE_API_URL: V4 challenge api url, default value is 'https://api.topcoder-dev.com/v4/challenges'
- V4_PLATFORMS_API_URL: v4 platforms api url, default value is 'https://api.topcoder-dev.com/v4/platforms'
- V4_TECHNOLOGIES_API_URL:v4 technologies api url, default value is 'https://api.topcoder-dev.com/v4/technologies'
- V5_CHALLENGE_API_URL: v5 challenge api url, default value is 'http://localhost:4000/v5/challenges'
- V5_CHALLENGE_TYPE_API_URL: v5 challenge type api url, default value is 'http://localhost:4000/v5/challengeTypes'

There is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable

Configuration for the tests is at `config/test.js`, only add such new configurations different from `config/default.js`
- MOCK_API_PORT: the mock server port, default is 4000
- WAIT_TIME: wait time used in test, default is 1500 or 1.5 second
- V4_CHALLENGE_API_URL: the v4 challenge api url, used mock v4 challenge api in testing

## Local Kafka setup

- `http://kafka.apache.org/quickstart` contains details to setup and manage Kafka server,
  below provides details to setup Kafka server in Linux/Mac, Windows will use bat commands in bin/windows instead
- download kafka at `https://www.apache.org/dyn/closer.cgi?path=/kafka/1.1.0/kafka_2.11-1.1.0.tgz`
- extract out the downloaded tgz file
- go to extracted directory kafka_2.11-0.11.0.1
- start ZooKeeper server:
  `bin/zookeeper-server-start.sh config/zookeeper.properties`
- use another terminal, go to same directory, start the Kafka server:
  `bin/kafka-server-start.sh config/server.properties`
- note that the zookeeper server is at localhost:2181, and Kafka server is at localhost:9092
- use another terminal, go to same directory, create the needed topics:
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic challenge.notification.create`

  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic challenge.notification.update`

- verify that the topics are created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics
- run the producer and then write some message into the console to send to the `challenge.notification.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.create`
  in the console, write message, one message per line:
  `{ "topic": "challenge.notification.create", "originator": "challenge-api", "timestamp": "2019-05-14T00:00:00.000Z", "mime-type": "application/json", "payload": { "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011", "typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098", "track": "CODE", "name": "test-for-legacy-challenge-processor", "description": "<p>test</p>", "phases": [{ "id": "id-1", "name": "registration", "isActive": true, "duration": 345600000 }, { "id": "id-2", "name": "submission", "isActive": true, "duration": 345600000 }, { "id": "id-3", "name": "checkpoint", "isActive": true, "duration": 172800000 } ], "prizeSets": [{ "type": "Code", "prizes": [{ "type": "first-place", "value": 1000 }, { "type": "second-place", "value": 500 }] }, { "type": "Check Point", "prizes": [{ "type": "first-place", "value": 200 }, { "type": "second-place", "value": 200 }, { "type": "third-place", "value": 200 }] }], "reviewType": "COMMUNITY", "markdown": false, "tags": ["Node.js", "NodeJS", "MongoDB", "AWS"], "projectId": 5087, "forumId": 33059 } }`
- optionally, use another terminal, go to same directory, start a consumer to view the messages:
  `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic challenge.notification.create --from-beginning`
- writing/reading messages to/from other topics are similar

## Mock V5 Challenge API
Mock V5 challenge api is under `test/mock` folder. You can use command `npm run mock-api` to start the server.

## Local deployment
1. Make sure that Kafka is running as per instructions above.
2. From the project root directory, run the following command to install the dependencies
```
npm install
```
3. To run linters if required
```
npm run lint

npm run lint:fix # To fix possible lint errors
```
4. Start the mock server
```
npm run mock-api
```
5. Start the processor and health check dropin
```
npm start
```

## Testing
- Run `npm run test` to execute unit tests and generate coverage report.
- RUN `npm run e2e` to execute e2e tests and generate coverage report.

## Verification
Refer `Verification.md`
