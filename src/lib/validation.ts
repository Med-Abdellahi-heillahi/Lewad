export const mauritanianPhonePattern = /^[234][0-9]{7}$/
export const arabicNamePattern = /^[\u0600-\u06FF\s]+$/
export const avatarPathPattern = /\.(png|jpg|jpeg|webp)$/i
export const establishmentImagePattern = /\.(png|jpg|jpeg)$/i
export const maxAvatarFileSizeBytes = 2 * 1024 * 1024

const allowedAvatarMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Stores the local Mauritanian number in its canonical eight-digit form. */
export function normalizeMauritanianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('222') ? digits.slice(3) : digits
}

export function isValidMauritanianPhone(value: string) {
  return mauritanianPhonePattern.test(normalizeMauritanianPhone(value))
}

export function isValidArabicName(value: string) {
  return value === '' || arabicNamePattern.test(value)
}

export function isAllowedAvatarPath(value: string) {
  return value === '' || avatarPathPattern.test(value)
}

/**
 * Image d'établissement : chemin ou URL seulement. Tant qu'aucun bucket Storage
 * n'est configuré pour les établissements, l'admin ne peut que référencer une
 * image déjà hébergée — d'où l'absence de `webp`, non demandé pour ce champ.
 */
export function isAllowedEstablishmentImagePath(value: string) {
  const trimmed = value.trim()
  return trimmed === '' || establishmentImagePattern.test(trimmed)
}

/** Un nom arabe obligatoire doit être non vide *et* écrit en caractères arabes. */
export function isRequiredArabicName(value: string) {
  const trimmed = value.trim()
  return trimmed !== '' && arabicNamePattern.test(trimmed)
}

export function isAllowedAvatarFile(file: File) {
  return allowedAvatarMimeTypes.has(file.type) && avatarPathPattern.test(file.name)
}

export function isAvatarFileTooLarge(file: File) {
  return file.size > maxAvatarFileSizeBytes
}

export function isValidLewadSignUpPassword(password: string) {
  const digitCount = (password.match(/\d/g) || []).length
  return password.length >= 8 && digitCount === 4 && /[A-Za-z]/.test(password)
}
