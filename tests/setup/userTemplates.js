const BASE_USER_TEMPLATE = {
  phone: '+1234567890',
  email: 'baseuser@example.com',
  phone_verified: false,
  email_verified: false,
  status: 'active',
  kyc_level: 'none'
};

// Use timestamp and random number to ensure uniqueness across test runs
let phoneCounter = Date.now() % 1000000; // Start with timestamp modulo
const generateUniquePhone = () => {
  phoneCounter++;
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `+1${phoneCounter}${randomSuffix}`;
};

let emailCounter = Date.now() % 10000; // Start with timestamp modulo
const generateUniqueEmail = () => {
  emailCounter++;
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `testuser${emailCounter}_${timestamp}_${randomSuffix}@example.com`;
};

// Reset counters to avoid conflicts between test runs
const resetCounters = () => {
  phoneCounter = Date.now() % 1000000;
  emailCounter = Date.now() % 10000;
};

export const UserTemplates = {

  getValidUser: (overrides = {}) => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: generateUniqueEmail(),
    ...overrides
  }),

  getValidUserWithStatus: (status = 'active') => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: generateUniqueEmail(),
    status: status
  }),

  getVerifiedUser: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: generateUniqueEmail(),
    phone_verified: true,
    email_verified: true,
    verified: true
  }),

  getUserWithInvalidPhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: 'invalid-phone', // number is invalid
    email: generateUniqueEmail()
  }),

  getUserWithShortPhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: '+123',
    email: generateUniqueEmail()
  }),

  
  getUserWithAlphaPhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: '+1abc567890',
    email: generateUniqueEmail()
  }),

  
  getUserWithInvalidEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: 'invalid-email'
  }),

  
  getUserWithNoAtSignEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: 'invalidemail.com' 
  }),

  
  getUserWithNoDomainEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: 'invalid@'
  }),

  
  getUserWithInvalidStatus: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: generateUniqueEmail(),
    status: 'invalid-status'
  }),

  
  getUserWithInvalidKycLevel: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: generateUniqueEmail(),
    kyc_level: 'invalid-kyc'
  }),

  
  getUserWithEmptyPhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: '',
    email: generateUniqueEmail()
  }),

  getUserWithEmptyEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: ''
  }),

  
  getUserWithNullPhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: null,
    email: generateUniqueEmail()
  }),

  getUserWithNullEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: null
  }),

  
  getUserWithUndefinedPhone: () => {
    const user = {
      ...BASE_USER_TEMPLATE,
      email: generateUniqueEmail()
    };
    delete user.phone;
    return user;
  },

  getUserWithUndefinedEmail: () => {
    const user = {
      ...BASE_USER_TEMPLATE,
      phone: generateUniquePhone()
    };
    delete user.email;
    return user;
  },

  
  getIncompleteUser: () => ({
    phone_verified: false,
    email_verified: false
  }),

  EXISTING_PHONE: '+1234567890',
  EXISTING_EMAIL: 'existing@example.com',

  getUserWithDuplicatePhone: () => ({
    ...BASE_USER_TEMPLATE,
    phone: UserTemplates.EXISTING_PHONE,
    email: generateUniqueEmail()
  }),

  getUserWithDuplicateEmail: () => ({
    ...BASE_USER_TEMPLATE,
    phone: generateUniquePhone(),
    email: UserTemplates.EXISTING_EMAIL 
  }),

  
  getMultipleValidUsers: (count = 3) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(UserTemplates.getValidUser());
    }
    return users;
  },

  
  getUsersWithDifferentStatuses: () => [
    UserTemplates.getValidUserWithStatus('active'),
    UserTemplates.getValidUserWithStatus('suspended'),
    UserTemplates.getValidUserWithStatus('deleted')
  ],

  
  getAllTestUsers: () => ({
    valid: [
      UserTemplates.getValidUser(),
      UserTemplates.getVerifiedUser(),
              UserTemplates.getValidUserWithStatus('suspended')
    ],
    invalidPhone: [
      UserTemplates.getUserWithInvalidPhone(),
      UserTemplates.getUserWithShortPhone(),
      UserTemplates.getUserWithAlphaPhone(),
      UserTemplates.getUserWithEmptyPhone(),
      UserTemplates.getUserWithNullPhone(),
      UserTemplates.getUserWithUndefinedPhone()
    ],
    invalidEmail: [
      UserTemplates.getUserWithInvalidEmail(),
      UserTemplates.getUserWithNoAtSignEmail(),
      UserTemplates.getUserWithNoDomainEmail(),
      UserTemplates.getUserWithEmptyEmail(),
      UserTemplates.getUserWithNullEmail(),
      UserTemplates.getUserWithUndefinedEmail()
    ],
    invalidOther: [
      UserTemplates.getUserWithInvalidStatus(),
      UserTemplates.getUserWithInvalidKycLevel(),
      UserTemplates.getIncompleteUser()
    ],
    duplicates: [
      UserTemplates.getUserWithDuplicatePhone(),
      UserTemplates.getUserWithDuplicateEmail()
    ]
  }),

  
  resetCounters: () => {
    phoneCounter = Date.now() % 1000000;
    emailCounter = Date.now() % 10000;
  }
};


export const UserTestHelpers = {
  
  
  expectValidUserStructure: (user) => {
    return {
      hasRequiredFields: !!(user && user.phone), // Only phone is required
      hasValidPhone: !!(user && user.phone && user.phone.startsWith('+') && user.phone.length >= 10),
      hasValidEmail: !user.email || (user.email && user.email.includes('@') && user.email.includes('.')), // Email can be null or valid
              hasValidStatus: !!(user && user.status && ['active', 'suspended', 'deleted'].includes(user.status)),
      hasValidKycLevel: !!(user && user.kyc_level && ['none', 'basic', 'enhanced', 'full'].includes(user.kyc_level))
    };
  },

  
  createExistingUserData: () => ({
    phone: UserTemplates.EXISTING_PHONE,
    email: UserTemplates.EXISTING_EMAIL,
    phone_verified: true,
    email_verified: true,
    status: 'active',
    kyc_level: 'basic'
  }),

  
  EXPECTED_ERRORS: {
    INVALID_PHONE: ['Invalid phone number', 'Phone validation failed'],
    INVALID_EMAIL: ['Invalid email format', 'Email validation failed'],
    DUPLICATE_PHONE: ['Phone number already exists', 'Duplicate phone'],
    DUPLICATE_EMAIL: ['Email already exists', 'Duplicate email'],
    MISSING_REQUIRED: ['Required field missing', 'Missing required data'],
    INVALID_STATUS: ['Invalid status', 'Status validation failed'],
    INVALID_KYC: ['Invalid KYC level', 'KYC validation failed']
  }
};

export default UserTemplates; 