# Topcoder - Legacy Challenge Processor

## Prerequisites :
-- If you previously built the legacy-challenge-processor docker image, make sure it is removed before rebuilding the new one using this submission.
-- This verification guides assumes using a fresh Informix database with the updates mentioned in ReadMe.md

## Verification
start Kafka server, start Informix database, start mock api server and start the processor

1. start kafka-console-producer to write messages to `challenge.notification.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.create`
2. write create challenge message:
  `{ "topic": "challenge.notification.create","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "CODE","name": "test-for-legacy-challenge-processor","description": "<p>test</p>","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }, { "id": "id-3","name": "checkpoint","isActive": true, "duration": 172800000 } ], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 1000 }, { "type": "second-place","value": 500 }] }, { "type": "Check Point", "prizes": [{ "type": "first-place","value": 200 }, { "type": "second-place","value": 200 }, { "type": "third-place","value": 200 }] }],"reviewType": "COMMUNITY","markdown": false,"tags": ["Java","JUnit","MongoDB","AWS"],"projectId": 3000,"forumId": 33059, "copilotId": 124861, "status": "Active"} }`

3. Use databasse GUI tool to execute the following sql statements to get the data of the created Challenge :
```sql
select * from tcs_catalog:project where tc_direct_project_id = 3000;
```
This statement will show an output similar to https://drive.google.com/open?id=11WySjFHRGchK4jiGni05VbMierAJw5zs

The project_id value (30005520) in the output represents the legacyId of the created challenge and this value will be used in the next SQL statement

4. Execute the following SQL statements to check the challenge prizes (replace <legacyId> with the value of project_id column in the previous statement):
```sql
select * from tcs_catalog:prize where project_id = <legacyId>
```
The output should be similar to this one : https://drive.google.com/open?id=1YG5MNT8mYcubZjyJPKJkHJc910Dxe5Qu

5. Open your browser and navigate to https://lauscher.topcoder-dev.com/ , Login as TonyJ/appirio123

6. On the top left of the main page in 'Topic:' dropdown list select the topic that was configured for CREATE_CHALLENGE_RESOURCE_TOPIC in default.js ('challenge.action.resource.create' if using default value) and click on 'View' button.
 There should be 5 messages sent to this topic :
 -- One message for the Copilot resource :
  ksmith, user_id = 124861, challengeId = "1a4ef3a8-ed35-40d1-b8a6-7371a700d011" 'payload.id' from the event message payload and roleId = "bac822d2-725d-4973-9714-360918a09bc0" (The value configured in default.js COPILOT_ROLE_UUID)

 https://drive.google.com/open?id=1j7j2k-HtAB2SqbHm8uicPKKzP1dTEo7E


 -- The remaining 4 events sent to this topic are for observers , for example for user "wyzmo" (user_id = 124856), who is a Copilot on the TC direct project but is not the copilot of the created challenge :
 Check the roleId, it should match the value configured for OBSERVER_ROLE_UUID in default.js


 7. Check code styling by running the following commands locally :
   -- `npm install`
   -- `npm run lint`