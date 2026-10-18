import { authErrorKey } from './authErrors';

describe('safe auth errors', () => {
  it.each([
    [{ code: 'email_address_not_authorized' }, 'auth.emailDeliveryRestricted'],
    [{ code: 'email_provider_disabled' }, 'auth.emailProviderDisabled'],
    [{ code: 'email_address_invalid' }, 'auth.emailRejected'],
    [{ code: 'invalid_credentials', status: 401 }, 'auth.invalidCredentials'],
    [{ code: 'email_not_confirmed' }, 'auth.emailNotConfirmed'],
    [{ code: 'signup_disabled' }, 'auth.signupDisabled'],
    [{ code: 'weak_password' }, 'auth.weakPassword'],
    [{ code: 'user_already_exists' }, 'auth.accountExists'],
    [{ code: 'captcha_failed' }, 'auth.verificationFailed'],
    [{ code: 'request_timeout' }, 'auth.networkError'],
    [{ status: 401 }, 'auth.projectConfigError'],
    [{ message: 'Invalid API key' }, 'auth.projectConfigError'],
    [{ status: 429 }, 'auth.rateLimited'],
    [{ status: 503, name: 'AuthRetryableFetchError' }, 'auth.serviceError'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'auth.networkError'],
    [new TypeError('Failed to fetch'), 'auth.networkError'],
  ])('classifies an SDK or gateway failure safely', (error, expected) => {
    expect(authErrorKey(error, 'auth.signupError')).toBe(expected);
  });

  it.each([
    null,
    undefined,
    'private server response',
    { code: 'unknown', message: 'private server response' },
  ])('never forwards unknown server details', (error) =>
    expect(authErrorKey(error, 'auth.signupError')).toBe('auth.signupError'),
  );
});
