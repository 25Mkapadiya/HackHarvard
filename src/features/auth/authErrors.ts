// Only return translation keys. Never display a server message, URL, or response body.
export function authErrorKey(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const code = 'code' in error ? error.code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return 'auth.invalidCredentials';
    case 'email_not_confirmed':
      return 'auth.emailNotConfirmed';
    case 'weak_password':
      return 'auth.weakPassword';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'auth.rateLimited';
    case 'signup_disabled':
      return 'auth.signupDisabled';
    case 'email_provider_disabled':
      return 'auth.emailProviderDisabled';
    case 'email_address_invalid':
      return 'auth.emailRejected';
    case 'email_address_not_authorized':
      return 'auth.emailDeliveryRestricted';
    case 'user_already_exists':
    case 'email_exists':
      return 'auth.accountExists';
    case 'captcha_failed':
      return 'auth.verificationFailed';
    case 'request_timeout':
      return 'auth.networkError';
  }
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  // Gateway API-key errors may not include an Auth error code.
  if (status === 401 || /invalid api key|no api key found/i.test(message)) return 'auth.projectConfigError';
  if (status === 429) return 'auth.rateLimited';
  if (status && status >= 500) return 'auth.serviceError';
  const name = 'name' in error ? error.name : undefined;
  if (name === 'AuthRetryableFetchError' || name === 'TypeError' || name === 'AbortError') {
    return 'auth.networkError';
  }
  return fallback;
}
