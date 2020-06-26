# Topcoder - Legacy Challenge Processor

## Verification

start Kafka server, start mock api server and start the processor

1. start kafka-console-producer to write messages to `challenge.notification.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.create`
2. write create challenge message:
  `{"topic":"challenge.notification.create","originator":"challenge-api","timestamp":"2019-05-14T00:00:00.000Z","mime-type":"application/json","payload":{"id":"0fe70d1a-ad3c-4c58-b341-a478145c4747","created":"2020-03-23T13:21:07.729Z","createdBy":"TopcoderService","typeId":"0b2ac310-eaf0-40e3-b66b-37e5e9e09365","track":"DEVELOPMENT","name":"Lets see if this will work 12","description":"test-description","timelineTemplateId":"a93544bc-c165-4af4-b55e-18f3593b457a","phases":[{"phaseId":"a93544bc-c165-4af4-b55e-18f3593b457a","duration":1000000,"id":"607e8f90-1ed6-49a3-b5a2-486b761a3def","name":"Registration","isOpen":false,"scheduledStartDate":"2020-03-14T16:28:39.882Z","scheduledEndDate":"2020-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"},{"phaseId":"6950164f-3c5e-4bdc-abc8-22aaf5a1bd49","duration":1000000,"id":"486fc45e-01e1-4a20-bda1-50cff82943db","name":"Submission","isOpen":false,"scheduledStartDate":"2020-03-14T16:28:39.882Z","scheduledEndDate":"2020-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"}],"prizeSets":[{"type":"Challenge prizes","description":"desc","prizes":[{"description":"desc-first","type":"first place","value":500},{"description":"desc-second","type":"second place","value":250}]}],"reviewType":"INTERNAL","tags":["Other"],"projectId":8913,"forumId":456,"status":"Draft","startDate":"2020-03-14T16:28:39.882Z","terms":[{"id":"0dedac8f-5a1a-4fe7-936f-e1d04dc65b7d","agreeabilityType":"Electronically-agreeable","title":"Terms & Conditions of Use at TopCoder","url":""}],"endDate":"2020-03-26T06:15:19.882Z","numOfSubmissions":0,"numOfRegistrants":0}}`

3. Watch the logs of processor:

```bash
info: Handle Kafka event message; Topic: challenge.notification.create; Partition: 0; Offset: 318; Message: {"topic":"challenge.notification.create","originator":"challenge-api","timestamp"
:"2019-05-14T00:00:00.000Z","mime-type":"application/json","payload":{"id":"0fe70d1a-ad3c-4c58-b341-a478145c4747","created":"2020-03-23T13:21:07.729Z","createdBy":"TopcoderService","typeId"
:"0b2ac310-eaf0-40e3-b66b-37e5e9e09365","track":"DEVELOPMENT","name":"Lets see if this will work 12","description":"test-description","timelineTemplateId":"a93544bc-c165-4af4-b55e-18f3593b4
57a","phases":[{"phaseId":"a93544bc-c165-4af4-b55e-18f3593b457a","duration":1000000,"id":"607e8f90-1ed6-49a3-b5a2-486b761a3def","name":"Registration","isOpen":false,"scheduledStartDate":"20
20-03-14T16:28:39.882Z","scheduledEndDate":"2020-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"},{"phaseId":"6950164f-3c5e-4bdc
-abc8-22aaf5a1bd49","duration":1000000,"id":"486fc45e-01e1-4a20-bda1-50cff82943db","name":"Submission","isOpen":false,"scheduledStartDate":"2020-03-14T16:28:39.882Z","scheduledEndDate":"202
0-03-26T06:15:19.882Z","actualStartDate":"2020-03-14T16:28:39.882Z","actualEndDate":"2020-03-26T06:15:19.882Z"}],"prizeSets":[{"type":"Challenge prizes","description":"desc","prizes":[{"des
cription":"desc-first","type":"first place","value":500},{"description":"desc-second","type":"second place","value":250}]}],"reviewType":"INTERNAL","tags":["Other"],"projectId":8913,"forumI
d":456,"status":"Draft","startDate":"2020-03-14T16:28:39.882Z","terms":[{"id":"0dedac8f-5a1a-4fe7-936f-e1d04dc65b7d","agreeabilityType":"Electronically-agreeable","title":"Terms & Condition
s of Use at TopCoder","url":""}],"endDate":"2020-03-26T06:15:19.882Z","numOfSubmissions":0,"numOfRegistrants":0}}.
debug: ENTER processCreate
debug: input arguments
debug: {
  message: {
    topic: 'challenge.notification.create',
    originator: 'challenge-api',
    timestamp: '2019-05-14T00:00:00.000Z',
    'mime-type': 'application/json',
    payload: {
      id: '0fe70d1a-ad3c-4c58-b341-a478145c4747',
      created: '2020-03-23T13:21:07.729Z',
      createdBy: 'TopcoderService',
      typeId: '0b2ac310-eaf0-40e3-b66b-37e5e9e09365',
      track: 'DEVELOPMENT',
      name: 'Lets see if this will work 12',
      description: 'test-description',
      timelineTemplateId: 'a93544bc-c165-4af4-b55e-18f3593b457a',
      phases: [Array],
      prizeSets: [Array],
      reviewType: 'INTERNAL',
      tags: [Array],
      projectId: 8913,
      forumId: 456,
      status: 'Draft',
      startDate: '2020-03-14T16:28:39.882Z',
      terms: [Array],
      endDate: '2020-03-26T06:15:19.882Z',
      numOfSubmissions: 0,
      numOfRegistrants: 0
    }
  }
}
debug: Parsed Payload {"subTrack":"DEVELOPMENT","name":"Lets see if this will work 12","reviewType":"INTERNAL","projectId":8913,"forumId":456,"status":"Draft","confidentialityType":"public"
,"submissionGuidelines":"Please read above","submissionVisibility":true,"milestoneId":1,"track":"DESIGN","detailedRequirements":"<p>test-description</p>","registrationStartsAt":"2020-03-30T
07:52:18.689Z","registrationEndsAt":"2020-03-30T08:08:58.689Z","registrationDuration":1000000,"submissionEndsAt":"2020-03-30T08:08:58.689Z","submissionDuration":1000000,"checkpointSubmissio
nStartsAt":null,"checkpointSubmissionEndsAt":null,"checkpointSubmissionDuration":null,"numberOfCheckpointPrizes":0,"checkpointPrize":0,"prizes":[500,250],"technologies":[{"id":27603959,"nam
e":"Other","description":"Other","status":{"id":1,"description":"Active"}}],"platforms":[{"name":"Other","id":26}]}
debug: processCreate :: beforeTry
debug: End of processCreate
debug: EXIT processCreate
debug: output arguments
debug: Successfully processed message
```

4. Check the mock-api logs:

```sql
debug: GET /v5/challenge-types/0b2ac310-eaf0-40e3-b66b-37e5e9e09365
debug: GET /v4/technologies
debug: GET /v4/platforms
debug: POST /v4/challenges
info: Create challenge entity in legacy system, the legacy id is 30055016
debug: {"param":{"subTrack":"DEVELOPMENT","name":"Lets see if this will work 12","reviewType":"INTERNAL","projectId":8913,"forumId":456,"status":"Draft","confidentialityType":"public","subm
issionGuidelines":"Please read above","submissionVisibility":true,"milestoneId":1,"track":"DESIGN","detailedRequirements":"<p>test-description</p>","registrationStartsAt":"2020-03-30T07:52:
18.689Z","registrationEndsAt":"2020-03-30T08:08:58.689Z","registrationDuration":1000000,"submissionEndsAt":"2020-03-30T08:08:58.689Z","submissionDuration":1000000,"checkpointSubmissionStart
sAt":null,"checkpointSubmissionEndsAt":null,"checkpointSubmissionDuration":null,"numberOfCheckpointPrizes":0,"checkpointPrize":0,"prizes":[500,250],"technologies":[{"id":27603959,"name":"Ot
her","description":"Other","status":{"id":1,"description":"Active"}}],"platforms":[{"name":"Other","id":26}]}}
debug: PATCH /v5/challenges/0fe70d1a-ad3c-4c58-b341-a478145c4747
debug: {"legacyId":30055016}
```

5. start kafka-console-producer to write messages to `challenge.notification.update` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.update`
6. write create challenge message:
  `{"topic":"challenge.notification.update","originator":"challenge-api","timestamp":"2019-05-14T00:00:00.000Z","mime-type":"application/json","payload":{"endDate":"2019-07-15T20:01:59.882Z","created":"2020-03-25T13:35:36.701Z","description":"test-update-m2m","legacyId":30055016,"prizeSets":[{"type":"Challenge prizes","description":"desc","prizes":[{"description":"desc-first","type":"first place","value":500},{"description":"desc-second","type":"second place","value":250}]}],"reviewType":"review type","timelineTemplateId":"a7e379b0-983e-4d17-bde3-1999b34402eb","tags":["tag1","tag2"],"terms":[{"id":"0fcb41d1-ec7c-44bb-8f3b-f017a61cd708","agreeabilityType":"DocuSignable","title":"Competition Non-Disclosure Agreement","url":"","templateId":"0c5b7081-1fff-4484-a20f-824c97a03b9b"},{"id":"be0652ae-8b28-4e91-9b42-8ad00b31e9cb","agreeabilityType":"Non-electronically-agreeable","title":"Subcontractor Services Agreement 2009-09-02","url":"http://www.topcoder.com/i/terms/Subcontractor+Services+Agreement+2009-09-02.pdf"},{"id":"28841de8-2f42-486f-beac-21d46a832ab6","agreeabilityType":"Electronically-agreeable","title":"2008 TCO Marathon Match Competition Official Rules","url":"http://topcoder.com/mm-terms"}],"createdBy":"TopcoderService","name":"test-update-m2m","typeId":"d0f8ad73-d9c6-4dbc-b213-e643f43d28e7","id":"2854b21e-d020-4042-9383-4881121fbb35","track":"CODE","projectId":123,"phases":[{"phaseId":"e7ac40eb-0273-424e-846a-dd9fc17b8aac","duration":1000000,"id":"aeae4b20-7188-4787-960e-336fbeef3c20","name":"Registration","isOpen":false,"scheduledStartDate":"2019-06-22T16:28:39.882Z","scheduledEndDate":"2019-07-04T06:15:19.882Z","actualStartDate":"2019-06-22T16:28:39.882Z","actualEndDate":"2019-07-04T06:15:19.882Z"},{"phaseId":"426474ce-81bd-409f-8673-c7cd9e7d590f","duration":2000000,"id":"6f71133d-8b00-4bdb-801f-86e7974a1480","name":"Submission","isOpen":false,"predecessor":"aeae4b20-7188-4787-960e-336fbeef3c20","scheduledStartDate":"2019-07-04T06:15:19.882Z","scheduledEndDate":"2019-07-27T09:48:39.882Z","actualStartDate":"2019-07-04T06:15:19.882Z","actualEndDate":"2019-07-27T09:48:39.882Z"}],"forumId":456,"startDate":"2019-06-22T16:28:39.882Z","status":"Draft","updated":"2020-03-25T13:41:42.820Z","updatedBy":"TopcoderService","attachments":[]}}`

7. Watch the logs of processor

```bash
info: Handle Kafka event message; Topic: challenge.notification.update; Partition: 0; Offset: 172; Message: {"topic":"challenge.notification.update","originator":"challenge-api","timestamp"
:"2019-05-14T00:00:00.000Z","mime-type":"application/json","payload":{"endDate":"2019-07-15T20:01:59.882Z","created":"2020-03-25T13:35:36.701Z","description":"test-update-m2m","legacyId":30
055016,"prizeSets":[{"type":"Challenge prizes","description":"desc","prizes":[{"description":"desc-first","type":"first place","value":500},{"description":"desc-second","type":"second place
","value":250}]}],"reviewType":"review type","timelineTemplateId":"a7e379b0-983e-4d17-bde3-1999b34402eb","tags":["tag1","tag2"],"terms":[{"id":"0fcb41d1-ec7c-44bb-8f3b-f017a61cd708","agreea
bilityType":"DocuSignable","title":"Competition Non-Disclosure Agreement","url":"","templateId":"0c5b7081-1fff-4484-a20f-824c97a03b9b"},{"id":"be0652ae-8b28-4e91-9b42-8ad00b31e9cb","agreeab
ilityType":"Non-electronically-agreeable","title":"Subcontractor Services Agreement 2009-09-02","url":"http://www.topcoder.com/i/terms/Subcontractor+Services+Agreement+2009-09-02.pdf"},{"id
":"28841de8-2f42-486f-beac-21d46a832ab6","agreeabilityType":"Electronically-agreeable","title":"2008 TCO Marathon Match Competition Official Rules","url":"http://topcoder.com/mm-terms"}],"c
reatedBy":"TopcoderService","name":"test-update-m2m","typeId":"d0f8ad73-d9c6-4dbc-b213-e643f43d28e7","id":"2854b21e-d020-4042-9383-4881121fbb35","track":"CODE","projectId":123,"phases":[{"p
haseId":"e7ac40eb-0273-424e-846a-dd9fc17b8aac","duration":1000000,"id":"aeae4b20-7188-4787-960e-336fbeef3c20","name":"Registration","isOpen":false,"scheduledStartDate":"2019-06-22T16:28:39.
882Z","scheduledEndDate":"2019-07-04T06:15:19.882Z","actualStartDate":"2019-06-22T16:28:39.882Z","actualEndDate":"2019-07-04T06:15:19.882Z"},{"phaseId":"426474ce-81bd-409f-8673-c7cd9e7d590f
","duration":2000000,"id":"6f71133d-8b00-4bdb-801f-86e7974a1480","name":"Submission","isOpen":false,"predecessor":"aeae4b20-7188-4787-960e-336fbeef3c20","scheduledStartDate":"2019-07-04T06:
15:19.882Z","scheduledEndDate":"2019-07-27T09:48:39.882Z","actualStartDate":"2019-07-04T06:15:19.882Z","actualEndDate":"2019-07-27T09:48:39.882Z"}],"forumId":456,"startDate":"2019-06-22T16:
28:39.882Z","status":"Draft","updated":"2020-03-25T13:41:42.820Z","updatedBy":"TopcoderService","attachments":[]}}.
debug: ENTER processUpdate
debug: input arguments
debug: {
  message: {
    topic: 'challenge.notification.update',
    originator: 'challenge-api',
    timestamp: '2019-05-14T00:00:00.000Z',
    'mime-type': 'application/json',
    payload: {
      endDate: '2019-07-15T20:01:59.882Z',
      created: '2020-03-25T13:35:36.701Z',
      description: 'test-update-m2m',
      legacyId: 30055016,
      prizeSets: [Array],
      reviewType: 'review type',
      timelineTemplateId: 'a7e379b0-983e-4d17-bde3-1999b34402eb',
      tags: [Array],
      terms: [Array],
      createdBy: 'TopcoderService',
      name: 'test-update-m2m',
      typeId: 'd0f8ad73-d9c6-4dbc-b213-e643f43d28e7',
      id: '2854b21e-d020-4042-9383-4881121fbb35',
      track: 'CODE',
      projectId: 123,
      phases: [Array],
      forumId: 456,
      startDate: '2019-06-22T16:28:39.882Z',
      status: 'Draft',
      updated: '2020-03-25T13:41:42.820Z',
      updatedBy: 'TopcoderService',
      attachments: []
    }
  }
}
debug: Parsed Payload {"subTrack":"CODE","name":"test-update-m2m","reviewType":"review type","projectId":123,"forumId":456,"status":"Draft","track":"DESIGN","detailedRequirements":"<p>test-
update-m2m</p>","registrationStartsAt":"2020-03-30T07:55:29.794Z","registrationEndsAt":"2020-03-30T08:12:09.794Z","registrationDuration":1000000,"submissionEndsAt":"2020-03-30T08:28:49.794Z
","submissionDuration":2000000,"checkpointSubmissionStartsAt":null,"checkpointSubmissionEndsAt":null,"checkpointSubmissionDuration":null,"numberOfCheckpointPrizes":0,"checkpointPrize":0,"pr
izes":[500,250],"technologies":[],"platforms":[]}
debug: EXIT processUpdate
debug: output arguments
debug: Successfully processed message
```



8. Watch the logs of mock-api :

```bash
debug: GET /v5/challenge-types/d0f8ad73-d9c6-4dbc-b213-e643f43d28e7
debug: GET /v4/technologies
debug: GET /v4/platforms
debug: GET /v4/challenges/30055016
debug: PUT /v4/challenges/30055016
debug: {"param":{"subTrack":"CODE","name":"test-update-m2m","reviewType":"review type","projectId":123,"forumId":456,"status":"Draft","track":"DESIGN","detailedRequirements":"<p>test-update
-m2m</p>","registrationStartsAt":"2020-03-30T07:55:29.794Z","registrationEndsAt":"2020-03-30T08:12:09.794Z","registrationDuration":1000000,"submissionEndsAt":"2020-03-30T08:28:49.794Z","sub
missionDuration":2000000,"checkpointSubmissionStartsAt":null,"checkpointSubmissionEndsAt":null,"checkpointSubmissionDuration":null,"numberOfCheckpointPrizes":0,"checkpointPrize":0,"prizes":
[500,250],"technologies":[],"platforms":[]}}
```

## Notes

Please note that legacy id 30055016 is created by mock-api and we should send the same legacyId via update message.
During create operation, we patch the V5 api to update legacyId.
