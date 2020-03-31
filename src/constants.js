/**
 * constants
 */

const prizeSetTypes = {
  ChallengePrizes: 'Challenge prizes',
  CheckPoint: 'Check Point'
}

const phaseTypes = {
  registration: 'registration',
  submission: 'submission',
  checkpoint: 'checkpoint'
}

const projectTypes = {
  Component: 1,
  Application: 2,
  Studio: 3,
  Generic: 4
}

const projectCategories = {
  DESIGN: {
    id: 1,
    name: 'Design',
    projectType: projectTypes.Component
  },
  DEVELOPMENT: {
    id: 2,
    name: 'Development',
    projectType: projectTypes.Component
  },
  SPECIFICATION: {
    id: 6,
    name: 'Specification',
    projectType: projectTypes.Application
  },
  ARCHITECTURE: {
    id: 7,
    name: 'Architecture',
    projectType: projectTypes.Application
  },
  BUG_HUNT: {
    id: 9,
    name: 'Bug Hunt',
    projectType: projectTypes.Application
  },
  TEST_SUITES: {
    id: 13,
    name: 'Test Suites',
    projectType: projectTypes.Application
  },
  ASSEMBLY: {
    id: 14,
    name: 'Assembly Competition',
    projectType: projectTypes.Application
  },
  BANNERS_ICONS: {
    id: 16,
    name: 'Banners/Icons',
    projectType: projectTypes.Studio
  },
  WEB_DESIGNS: {
    id: 17,
    name: 'Web Design',
    projectType: projectTypes.Studio
  },
  WIREFRAMES: {
    id: 18,
    name: 'Wireframes',
    projectType: projectTypes.Studio
  },
  UI_PROTOTYPES: {
    id: 19,
    name: 'UI Prototypes',
    projectType: projectTypes.Application
  },
  LOGO_DESIGN: {
    id: 20,
    name: 'Logo Design',
    projectType: projectTypes.Studio
  },
  PRINT_OR_PRESENTATION: {
    id: 21,
    name: 'Print/Presentation',
    projectType: projectTypes.Studio
  },
  IDEA_GENERATION: {
    id: 22,
    name: 'Idea Generation',
    projectType: projectTypes.Studio
  },
  CONCEPTUALIZATION: {
    id: 23,
    name: 'Conceptualization',
    projectType: projectTypes.Application
  },
  RIA_BUILD: {
    id: 24,
    name: 'RIA Build',
    projectType: projectTypes.Application
  },
  RIA_COMPONENT: {
    id: 25,
    name: 'RIA Component',
    projectType: projectTypes.Application
  },
  TEST_SCENARIOS: {
    id: 26,
    name: 'Test Scenarios',
    projectType: projectTypes.Application
  },
  COPILOT_POSTING: {
    id: 29,
    name: 'Copilot Posting',
    projectType: projectTypes.Application
  },
  WIDGET_OR_MOBILE_SCREEN_DESIGN: {
    id: 30,
    name: 'Widget or Mobile Screen Design',
    projectType: projectTypes.Studio
  },
  FRONT_END_FLASH: {
    id: 31,
    name: 'Front End Flash',
    projectType: projectTypes.Studio
  },
  APPLICATION_FRONT_END_DESIGN: {
    id: 32,
    name: 'Application Front End Design',
    projectType: projectTypes.Studio
  },
  OTHER: {
    id: 34,
    name: 'Other',
    projectType: projectTypes.Studio
  },
  CONTENT_CREATION: {
    id: 35,
    name: 'Content Creation',
    projectType: projectTypes.Application
  },
  REPORTING: {
    id: 36,
    name: 'REPORTING',
    projectType: projectTypes.Application
  },
  FIRST2FINISH: {
    id: 38,
    name: 'First2Finish',
    projectType: projectTypes.Application
  },
  DESIGN_FIRST2FINISH: {
    id: 40,
    name: 'Design First2Finish',
    projectType: projectTypes.Studio
  },
  CODE: {
    id: 39,
    name: 'Code',
    projectType: projectTypes.Application
  },
  MARATHON_MATCH: {
    id: 37,
    name: 'Marathon Match',
    projectType: projectTypes.Application
  }
}

const componentCategories = {
  NotSetParent: {
    id: 27202915,
    name: 'Not Set'
  },
  NotSet: {
    id: 27202916,
    name: 'Not Set'
  },
  Application: {
    id: 9926572,
    name: 'Application'
  },
  BusinessLayer: {
    id: 9926575,
    name: 'Business Layer'
  }
}

const EVENT_ORIGINATOR = 'legacy-challenge-processor'

const EVENT_MIME_TYPE = 'application/json'

const createChallengeStatusesMap = {
  'Active': 1,
  'Draft': 2
}

// The user id to be associated with the legacy-challenge-processor
// It is used for auditing purpose ( create_user, and modify_user in the database)
// Default value is set to the id of heffan user
const processorUserId = 132456

const prizeTypesIds = {
  Contest: 15,
  Checkpoint: 14
}

module.exports = {
  prizeSetTypes,
  phaseTypes,
  projectTypes,
  projectCategories,
  componentCategories,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  createChallengeStatusesMap,
  processorUserId,
  prizeTypesIds
}
