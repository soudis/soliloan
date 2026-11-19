import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEV_AGENT_DEFAULT_EMAIL, DEV_AGENT_DEFAULT_PASSWORD, devAgentCredentials, isDevSeed } from './dev-seed';

describe('isDevSeed', () => {
  it('seeds dev data for a dev environment outside production', () => {
    assert.equal(isDevSeed({ ENVIRONMENT: 'dev', NODE_ENV: 'development' }), true);
    assert.equal(isDevSeed({ ENVIRONMENT: 'dev' }), true);
  });

  it('never seeds dev data on staging, demo or production', () => {
    assert.equal(isDevSeed({ ENVIRONMENT: 'staging', NODE_ENV: 'production' }), false);
    assert.equal(isDevSeed({ ENVIRONMENT: 'demo', NODE_ENV: 'production' }), false);
    assert.equal(isDevSeed({ ENVIRONMENT: 'production', NODE_ENV: 'production' }), false);
    assert.equal(isDevSeed({ ENVIRONMENT: 'staging', NODE_ENV: 'development' }), false);
  });

  it('never seeds dev data when NODE_ENV is production, even with ENVIRONMENT=dev', () => {
    assert.equal(isDevSeed({ ENVIRONMENT: 'dev', NODE_ENV: 'production' }), false);
  });

  it('never seeds dev data without an ENVIRONMENT', () => {
    assert.equal(isDevSeed({ NODE_ENV: 'development' }), false);
    assert.equal(isDevSeed({}), false);
  });
});

describe('devAgentCredentials', () => {
  it('takes the agent account from the environment', () => {
    assert.deepEqual(
      devAgentCredentials({ SOLILOAN_DEV_AGENT_EMAIL: 'bot@example.test', SOLILOAN_DEV_AGENT_PASSWORD: 'secret' }),
      { email: 'bot@example.test', password: 'secret' },
    );
  });

  it('falls back to the defaults of .env.example when the keys are missing or empty', () => {
    assert.deepEqual(devAgentCredentials({}), {
      email: DEV_AGENT_DEFAULT_EMAIL,
      password: DEV_AGENT_DEFAULT_PASSWORD,
    });
    assert.deepEqual(devAgentCredentials({ SOLILOAN_DEV_AGENT_EMAIL: '', SOLILOAN_DEV_AGENT_PASSWORD: '' }), {
      email: DEV_AGENT_DEFAULT_EMAIL,
      password: DEV_AGENT_DEFAULT_PASSWORD,
    });
  });
});
