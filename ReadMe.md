# Topcoder - Legacy Challenge Processor

This microservice processes kafka events related to challenges and backfills data via V4 Challenge API.

### Development deployment status
[![CircleCI](https://circleci.com/gh/topcoder-platform/legacy-challenge-processor/tree/develop.svg?style=svg)](https://circleci.com/gh/topcoder-platform/legacy-challenge-processor/tree/develop)
### Production deployment status
[![CircleCI](https://circleci.com/gh/topcoder-platform/legacy-challenge-processor/tree/master.svg?style=svg)](https://circleci.com/gh/topcoder-platform/legacy-challenge-processor/tree/master)

## Intended use
- Processor

## Related repos

- [Challenge API](https://github.com/topcoder-platform/challenge-api)

## Prerequisites
- [NodeJS](https://nodejs.org/en/) (v12)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Kafka](https://kafka.apache.org/)

## Configuration

Configuration for the legacy challenge processor is at `config/default.js`.
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
- KAFKA_ERROR_TOPIC: The kafka error topic.
- BUSAPI_URL: Bus API URL
- CREATE_CHALLENGE_TOPIC: the create challenge Kafka message topic, default value is 'challenge.notification.create'
- UPDATE_CHALLENGE_TOPIC: the update challenge Kafka message topic, default value is 'challenge.notification.update'
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- AUTH0_PROXY_SERVER_URL: Proxy Auth0 URL, used to get TC M2M token
- V5_CHALLENGE_API_URL: v5 challenge api url, default value is 'http://localhost:4000/v5/challenges'
- V5_CHALLENGE_TYPE_API_URL: v5 challenge type api url, default value is 'http://localhost:4000/v5/challengeTypes'
- V4_CHALLENGE_API_URL: v4 challenge api url, default value is 'http://localhost:4000/v4/challenges'
- V4_TECHNOLOGIES_API_URL: v4 technologies api url, default value is 'http://localhost:4000/v4/technologies'
- V4_PLATFORMS_API_URL: v4 platforms api url, default value is 'http://localhost:4000/v4/platforms'

There is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable

Configuration for the tests is at `config/test.js`, only add such new configurations different from `config/default.js`
- MOCK_API_PORT: the mock server port, default is 4000
- WAIT_TIME: wait time used in test, default is 1500 or 1.5 second

You can find sample `.env` files inside the `/docker` directory.

###   Foreman Setup
 To install foreman follow this [link](https://theforeman.org/manuals/1.24/#3.InstallingForeman)
 To know how to use foreman follow this [link](https://theforeman.org/manuals/1.24/#2.Quickstart)


### Local Kafka setup

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
  `{"topic":"challenge.notification.create","originator":"challenge-api","timestamp":"2019-05-14T00:00:00.000Z","mime-type":"application/json","payload":{"id":"0fe70d1a-ad3c-4c58-b341-a478145c4747","created":"2020-03-23T13:21:07.729Z","createdBy":"TopcoderService","typeId":"0b2ac310-eaf0-40e3-b66b-37e5e9e09365","track":"DEVELOPMENT","name":"Lets see if this will work 12","description":"test-description","timelineTemplateId":"a93544bc-c165-4af4-b55e-18f3593b457a","phases":[{"phaseId":"a93544bc-c165-4af4-b55e-18f3593b457a","duration":1000000,"id":"607e8f90-1ed6-49a3-b5a2-486b761a3def","name":"Registration","isOpen":false,"scheduledStartDate":"2020-03-14T16:28:39.882Z","scheduledEndDate":"2020-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"},{"phaseId":"6950164f-3c5e-4bdc-abc8-22aaf5a1bd49","duration":1000000,"id":"486fc45e-01e1-4a20-bda1-50cff82943db","name":"Submission","isOpen":false,"scheduledStartDate":"2020-03-14T16:28:39.882Z","scheduledEndDate":"2020-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"}],"prizeSets":[{"type":"Challenge prizes","description":"desc","prizes":[{"description":"desc-first","type":"first place","value":500},{"description":"desc-second","type":"second place","value":250}]}],"reviewType":"INTERNAL","tags":["Other"],"projectId":8913,"forumId":456,"status":"Draft","startDate":"2020-03-14T16:28:39.882Z","terms":[{"id":"0dedac8f-5a1a-4fe7-936f-e1d04dc65b7d","agreeabilityType":"Electronically-agreeable","title":"Terms & Conditions of Use at TopCoder","url":""}],"endDate":"2020-03-26T06:15:19.882Z","numOfSubmissions":0,"numOfRegistrants":0}}`
- optionally, use another terminal, go to same directory, start a consumer to view the messages:
  `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic challenge.notification.create --from-beginning`
- writing/reading messages to/from other topics are similar

### Local deployment without Docker

Please make sure you installed and configured kafka

Install all dependencies

```
npm install
```

Run the lint

```
npm run lint
```

Set environment variables for M2M Token

```
export AUTH0_CLIENT_ID=jGIf2pd3f44B1jqvOai30BIKTZanYBfU
export AUTH0_CLIENT_SECRET=ldzqVaVEbqhwjM5KtZ79sG8djZpAVK8Z7qieVcC3vRjI4NirgcinKSBpPwk6mYYP
```

Mock server will be started by test tool during testing but for completing local setup please run mock server
in a separate terminal after running tests. Shutdown mock-api for running tests.

```
npm run mock-api
```

Run the application

```
npm start
```

We will be using mock version of V4 and V5 APIs for local development and testing. You can also configure
corresponding environment variables and point processor to topcoder-dev environment.

### Local Deployment with Docker

1. Make sure that Kafka, mock server are running as per instructions above.

2. Go to `docker` folder

3. Rename the file `sample.api.env` to `api.env` And properly update the IP addresses to match below environment for the variables ( make sure to use IP address instead of hostname ( i.e localhost will not work)).Here is an example:
Please see that 192.168.1.3 is the IP of host machine for docker where we run all the dependencies

```
KAFKA_URL=192.168.1.3:9092
V5_CHALLENGE_API_URL=http://192.168.1.3:4000/v5/challenges
V5_CHALLENGE_TYPE_API_URL=http://192.168.1.3:4000/v5/challengeTypes
V4_CHALLENGE_API_URL=http://192.168.1.3:4000/v4/challenges
V4_TECHNOLOGIES_API_URL=http://192.168.1.3:4000/v4/technologies
V4_PLATFORMS_API_URL=http://192.168.1.3:4000/v4/platforms
AUTH0_CLIENT_ID=jGIf2pd3f44B1jqvOai30BIKTZanYBfU
AUTH0_CLIENT_SECRET=ldzqVaVEbqhwjM5KtZ79sG8djZpAVK8Z7qieVcC3vRjI4NirgcinKSBpPwk6mYYP
AUTH0_URL=https://topcoder-dev.auth0.com/oauth/token
AUTH0_AUDIENCE=https://m2m.topcoder-dev.com/
```

4. Once that is done, go to run the following command

```
docker-compose up
```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies


## Production Deployment

- TBD

## Running tests

### Configuration

Test configuration is at `config/test.js`. You don't need to change them.
The following test parameters can be set in config file or in env variables:

- MOCK_API_PORT: port of mock api (Default value conflicts with mock api server. So, please shutdown mock api before running tests)
- WAIT_TIME: wait time used in test, default is 1000 or one second

Set environment variables for M2M Token

```
export AUTH0_CLIENT_ID=jGIf2pd3f44B1jqvOai30BIKTZanYBfU
export AUTH0_CLIENT_SECRET=ldzqVaVEbqhwjM5KtZ79sG8djZpAVK8Z7qieVcC3vRjI4NirgcinKSBpPwk6mYYP
```

### Prepare
- Start Local services.
- Various config parameters should be properly set.

### Running unit tests
To run unit tests 

```bash
npm run test
```

### Running integration tests
To run integration tests 

```bash
npm run e2e
```
## Running tests in CI

- TBD

## Verification
Refer to the verification document `Verification.md`

## Notes

Application is configured to use local mock APs for development and you can point application
to topcoder dev environment for verification purposes. But, please be aware that you need to use correct
kafka message values for verification.

There are some critical issues in dependencies which come from Topcoder and no-kafka libraries. We use latest
versions as of now but these issues should be addressed.
