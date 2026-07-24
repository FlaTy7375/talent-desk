import i18n from "../../../shared/i18n";

const CODE_KEYS = {
  invalid_credentials: "login.errors.invalidCredentials",
  email_not_confirmed: "login.errors.emailNotConfirmed",
  user_already_exists: "login.errors.userExists",
  email_exists: "login.errors.userExists",
  weak_password: "login.errors.weakPassword",
  over_email_send_rate_limit: "login.errors.emailRateLimit",
  email_rate_limit_exceeded: "login.errors.emailRateLimit",
  over_request_rate_limit: "login.errors.rateLimit",
  signup_disabled: "login.errors.signupDisabled",
  user_banned: "login.errors.userBanned",
  validation_failed: "login.errors.validation",
  same_password: "login.errors.samePassword",
  provider_disabled: "login.errors.providerDisabled",
  bad_oauth_state: "login.errors.oauthFailed",
  unexpected_failure: "login.errors.generic",
};

const MESSAGE_KEYS = [
  [/email rate limit exceeded/i, "login.errors.emailRateLimit"],
  [/over_email_send_rate_limit/i, "login.errors.emailRateLimit"],
  [/invalid login credentials/i, "login.errors.invalidCredentials"],
  [/email not confirmed/i, "login.errors.emailNotConfirmed"],
  [/user already registered/i, "login.errors.userExists"],
  [/already been registered/i, "login.errors.userExists"],
  [/password should be at least/i, "login.errors.weakPassword"],
  [/password is known to be weak/i, "login.errors.weakPassword"],
  [/signup requires a valid password/i, "login.errors.weakPassword"],
  [/unable to validate email/i, "login.errors.invalidEmail"],
  [/invalid email/i, "login.errors.invalidEmail"],
  [/email address.*invalid/i, "login.errors.invalidEmail"],
  [/signups not allowed/i, "login.errors.signupDisabled"],
  [/user is banned/i, "login.errors.userBanned"],
  [/too many requests/i, "login.errors.rateLimit"],
  [/network/i, "login.errors.network"],
];

function resolveKey(error) {
  const code = String(error?.code || "").trim();
  if (code && CODE_KEYS[code]) return CODE_KEYS[code];

  const message = String(error?.message || error || "").trim();
  for (const [pattern, key] of MESSAGE_KEYS) {
    if (pattern.test(message)) return key;
  }
  return "login.errors.generic";
}

export function translateAuthError(error) {
  return i18n.t(resolveKey(error));
}
