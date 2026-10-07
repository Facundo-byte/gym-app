export function validateCredentials({ email = '', password = '', confirmation = '' }, mode) {
  const errors = {}
  if (mode !== 'password' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (mode !== 'reset' && !password) errors.password = 'Enter your password.'
  if (['signup', 'password'].includes(mode)) {
    if (password.length < 8) errors.password = 'Use at least 8 characters.'
    if (confirmation !== password) errors.confirmation = 'Passwords must match.'
  }
  return errors
}
