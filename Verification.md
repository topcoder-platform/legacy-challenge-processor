# Topcoder - Legacy Groups Processor

## Verification
start Kafka server, start mock api server and start the processor

1. start kafka-console-producer to write messages to `challenge.notification.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.create`
2. write message:
  `{ "topic": "challenge.notification.create","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "CODE","name": "test-for-legacy-challenge-processor","description": "<p>test</p>","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }, { "id": "id-3","name": "checkpoint","isActive": true, "duration": 172800000 } ], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 1000 }, { "type": "second-place","value": 500 }] }, { "type": "Check Point", "prizes": [{ "type": "first-place","value": 200 }, { "type": "second-place","value": 200 }, { "type": "third-place","value": 200 }] }],"reviewType": "COMMUNITY","markdown": false,"tags": ["Node.js","NodeJS","MongoDB","AWS"],"projectId": 5087,"forumId": 33059 } }`
3. Watch the app console, It will show message successfully handled. And has info log `Create challenge entity in legacy system, the legacy id is XXX`. Now mark down the legacy id.
4. Wait for a short period(1 minute), Then go to `https://api.topcoder-dev.com/v4/challenges/<legacy_id>` to verify the challenge has been created in legacy system. Note CODE challenge doesn't have checkpoint prize/phase, so the checkpoint prize is 0 in the legacy system.
5. start kafka-console-producer to write messages to `challenge.notification.update` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.update`
6. write message(Use the legacy id you mark down in step 3, as a number):
  `{ "topic": "challenge.notification.update","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "legacyId": <legacy_id>, "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "CODE","name": "update-for-legacy-challenge-processor","description": "#Title\n##sub title 1\ntext\n##sub title2\nanother text\n","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 800 }, { "type": "second-place","value": 400 }]}],"reviewType": "COMMUNITY","markdown":true,"tags": ["Node.js","NodeJS"],"projectId": 5087,"forumId": 33059 } }`
7. Wait for a short period(1 minute), Then go to `https://api.topcoder-dev.com/v4/challenges/<legacy_id>` to verify the challenge has been updated in legacy system.
8. Repeat step 1 to 7, to create other type of challenge. Here is the message payload for creating a Design challenge with checkpoint prizes:
  `{ "topic": "challenge.notification.create","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "3f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "WEB_DESIGNS","name": "test-design-demo","description": "<p>test design</p>","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }, { "id": "id-3","name": "checkpoint","isActive": true, "duration": 172800000 } ], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 1000 }, { "type": "second-place","value": 500 }] }, { "type": "Check Point", "prizes": [{ "type": "first-place","value": 200 }, { "type": "second-place","value": 200 }, { "type": "third-place","value": 200 }] }],"reviewType": "COMMUNITY","markdown": false,"tags": ["Node.js","NodeJS","MongoDB","AWS"],"projectId": 5087,"forumId": 33059 } }`


## Unit test Coverage
  51 passing (23s)

File                  |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
----------------------|----------|----------|----------|----------|-------------------|
All files             |    94.05 |    86.21 |    96.67 |    93.75 |                   |
 config               |      100 |      100 |      100 |      100 |                   |
  default.js          |      100 |      100 |      100 |      100 |                   |
  test.js             |      100 |      100 |      100 |      100 |                   |
 src                  |      100 |      100 |      100 |      100 |                   |
  bootstrap.js        |      100 |      100 |      100 |      100 |                   |
  constants.js        |      100 |      100 |      100 |      100 |                   |
 src/common           |    87.34 |       50 |    94.74 |    87.34 |                   |
  helper.js           |    73.33 |        0 |    83.33 |    73.33 |       16,17,18,20 |
  logger.js           |    90.63 |       60 |      100 |    90.63 |32,55,60,84,98,118 |
 src/services         |      100 |      100 |      100 |      100 |                   |
  ProcessorService.js |      100 |      100 |      100 |      100 |                   |

## E2E test Coverage

  54 passing (2m)

File                  |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
----------------------|----------|----------|----------|----------|-------------------|
All files             |    95.37 |    87.88 |     97.5 |    95.17 |                   |
 config               |      100 |      100 |      100 |      100 |                   |
  default.js          |      100 |      100 |      100 |      100 |                   |
  test.js             |      100 |      100 |      100 |      100 |                   |
 src                  |    94.12 |    66.67 |       90 |       94 |                   |
  app.js              |    93.75 |    66.67 |       90 |    93.62 |          48,61,86 |
  bootstrap.js        |      100 |      100 |      100 |      100 |                   |
  constants.js        |      100 |      100 |      100 |      100 |                   |
 src/common           |    91.14 |    66.67 |      100 |    91.14 |                   |
  helper.js           |    93.33 |       50 |      100 |    93.33 |                18 |
  logger.js           |    90.63 |       70 |      100 |    90.63 |32,55,60,84,98,118 |
 src/services         |      100 |      100 |      100 |      100 |                   |
  ProcessorService.js |      100 |      100 |      100 |      100 |                   |
