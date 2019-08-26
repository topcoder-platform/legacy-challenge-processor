# Topcoder - Legacy Challenge Processor

## Verification
start Kafka server, start Informix database, start mock api server and start the processor

1. start kafka-console-producer to write messages to `challenge.notification.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.create`
2. write message:
  `{ "topic": "challenge.notification.create","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "CODE","name": "test-for-legacy-challenge-processor","description": "<p>test</p>","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }, { "id": "id-3","name": "checkpoint","isActive": true, "duration": 172800000 } ], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 1000 }, { "type": "second-place","value": 500 }] }, { "type": "Check Point", "prizes": [{ "type": "first-place","value": 200 }, { "type": "second-place","value": 200 }, { "type": "third-place","value": 200 }] }],"reviewType": "COMMUNITY","markdown": false,"tags": ["Java","JUnit","MongoDB","AWS"],"projectId": 5087,"forumId": 33059 } }`
3. Use database GUI tool to execute following statements to verify AssetDTO data.
  ```sql
  select * from tcs_catalog:comp_catalog where component_id >= 3000;
  select * from tcs_catalog:comp_categories where comp_categories_id >= 3000;
  select * from tcs_catalog:comp_versions where comp_vers_id >= 3000;
  select * from tcs_catalog:comp_version_dates where comp_version_dates_id >=3000;
  select * from tcs_catalog:comp_technology where comp_tech_id >= 3000;
  ```
4. Use database GUI tool to insert the following test data(Only AssetDTO data has been persisted right now, so you can't retrieve the corresponding AssetDTO using the legacyId provided by message payload). project_info table will contain component version id of challenge, you can use the comp_vers_id retrieve from step 3 to replace the `value` column.
  ```sql
  insert into tcs_catalog:project(project_id, project_status_id, project_category_id, create_user, create_date, modify_user, modify_date) values(2000, 2, 39, 132456, current, 132456, current);
  insert into tcs_catalog:project_info(project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) values(2000, 1, 3001, 132456, current, 132456, current);
  ```
5. start kafka-console-producer to write messages to `challenge.notification.update` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.update`
6. write message
  `{ "topic": "challenge.notification.update","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "legacyId": 2000, "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "CODE","name": "update-for-legacy-challenge-processor","description": "#Title\n##sub title 1\ntext\n##sub title2\nanother text\n","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 800 }, { "type": "second-place","value": 400 }]}],"reviewType": "COMMUNITY","markdown":true,"tags": ["Node.js","NodeJS", "PostgreSQL"],"projectId": 5087,"forumId": 33059 } }`
7. Use database GUI tool to execute following statements to verify AssetDTO data.
  ```sql
  select * from tcs_catalog:comp_catalog where component_id >= 3000;
  select * from tcs_catalog:comp_technology where comp_tech_id >= 3000;
  ```
8. Try to change track, write the following message
  `{ "topic": "challenge.notification.update","originator": "challenge-api","timestamp": "2019-05-14T00:00:00.000Z","mime-type": "application/json","payload": { "legacyId": 2000, "id": "1a4ef3a8-ed35-40d1-b8a6-7371a700d011","typeId": "2f4ef3a8-ed35-40d1-b8a6-7371a700d098","track": "WEB_DESIGNS","name": "update-for-legacy-challenge-processor","description": "#Title\n##sub title 1\ntext\n##sub title2\nanother text\n","phases": [{ "id": "id-1","name": "registration","isActive": true, "duration": 345600000 }, { "id": "id-2","name": "submission","isActive": true, "duration": 345600000 }], "prizeSets": [{ "type": "Code","prizes": [{ "type": "first-place", "value": 800 }, { "type": "second-place","value": 400 }]}],"reviewType": "COMMUNITY","markdown":true,"tags": ["Node.js","NodeJS", "PostgreSQL"],"projectId": 5087,"forumId": 33059 } }`
9. You would see error message in app console.

## Unit test Coverage
  It is not available right now

## E2E test Coverage
  It is not available right now
