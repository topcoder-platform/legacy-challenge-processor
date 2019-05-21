module.exports = {
  requiredFields: ['payload.id', 'payload.typeId', 'payload.track', 'payload.name', 'payload.description', 'payload.phases', 'payload.prizeSets', 'payload.reviewType', 'payload.markdown', 'payload.tags', 'payload.projectId', 'payload.forumId'],
  stringFields: ['payload.typeId', 'payload.track', 'payload.name', 'payload.description', 'payload.reviewType'],
  integerFields: ['payload.projectId', 'payload.forumId'],
  arrayFields: ['payload.phases', 'payload.prizeSets'],
  testTopics: {
    create: {
      topic: 'challenge.notification.create',
      originator: 'challenge-api',
      timestamp: '2019-05-14T00:00:00.000Z',
      'mime-type': 'application/json',
      payload: {
        id: '1a4ef3a8-ed35-40d1-b8a6-7371a700d011',
        typeId: '2f4ef3a8-ed35-40d1-b8a6-7371a700d098',
        track: 'CODE',
        name: 'test-for-legacy-challenge-processor',
        description: '<p>test</p>',
        phases: [
          { id: 'id-1', name: 'registration', isActive: true, duration: 345600000 },
          { id: 'id-2', name: 'submission', isActive: true, duration: 345600000 },
          { id: 'id-3', name: 'checkpoint', isActive: true, duration: 172800000 }
        ],
        prizeSets: [
          { type: 'Code', prizes: [{ type: 'first-place', value: 1000 }, { type: 'second-place', value: 500 }] },
          { type: 'Check Point', prizes: [{ type: 'first-place', value: 200 }, { type: 'second-place', value: 200 }, { type: 'third-place', value: 200 }] }
        ],
        reviewType: 'COMMUNITY',
        markdown: false,
        tags: ['Node.js', 'NodeJS', 'MongoDB', 'AWS'],
        projectId: 5087,
        forumId: 33059
      }
    },
    update: {
      topic: 'challenge.notification.update',
      originator: 'challenge-api',
      timestamp: '2019-05-14T00:00:00.000Z',
      'mime-type': 'application/json',
      payload: {
        id: '1a4ef3a8-ed35-40d1-b8a6-7371a700d011',
        legacyId: 30055016,
        typeId: '2f4ef3a8-ed35-40d1-b8a6-7371a700d098',
        track: 'CODE',
        name: 'test-for-legacy-challenge-processor',
        description: '#Title\n##sub title 1\ntext\n##sub title2\nanother text\n',
        phases: [
          { id: 'id-1', name: 'registration', isActive: true, duration: 345600000 },
          { id: 'id-2', name: 'submission', isActive: true, duration: 345600000 }
        ],
        prizeSets: [
          { type: 'Code', prizes: [{ type: 'first-place', value: 800 }, { type: 'second-place', value: 400 }] }
        ],
        reviewType: 'COMMUNITY',
        markdown: true,
        tags: ['Node.js', 'NodeJS', 'MongoDB', 'AWS'],
        projectId: 5087,
        forumId: 33059
      }
    }
  }
}
