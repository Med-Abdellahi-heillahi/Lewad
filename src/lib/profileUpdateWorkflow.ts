import type {
  AvatarUploadError,
  AvatarUploadResult,
  ProfileUpdateResult,
  SafeProfileUpdate,
} from './db1'

type AvatarUploader = (file: File) => Promise<AvatarUploadResult>
type ProfileUpdater = (patch: SafeProfileUpdate) => Promise<ProfileUpdateResult>

export type ProfileUpdateWorkflowOptions = {
  patch: SafeProfileUpdate
  avatar: File | null
  uploadAvatar: AvatarUploader
  updateProfile: ProfileUpdater
  onUploadStateChange?: (uploading: boolean) => void
  onSaveStateChange?: (saving: boolean) => void
}

export type ProfileUpdateWorkflowResult =
  | { kind: 'avatar_failed'; error: AvatarUploadError }
  | { kind: 'profile_saved'; result: ProfileUpdateResult; avatarUpdated: boolean }

/**
 * Keeps profile changes partial: an avatar URL joins the patch only after the
 * object upload succeeds. A failed upload never invokes the profile update,
 * so it cannot clear a previously saved avatar.
 */
export async function saveProfileWithOptionalAvatar({
  patch,
  avatar,
  uploadAvatar,
  updateProfile,
  onUploadStateChange,
  onSaveStateChange,
}: ProfileUpdateWorkflowOptions): Promise<ProfileUpdateWorkflowResult> {
  const nextPatch: SafeProfileUpdate = { ...patch }

  if (avatar) {
    onUploadStateChange?.(true)
    const uploadResult = await uploadAvatar(avatar)
    onUploadStateChange?.(false)

    if (uploadResult.error || !uploadResult.data) {
      return { kind: 'avatar_failed', error: uploadResult.error ?? 'upload_failed' }
    }

    nextPatch.avatar_url = uploadResult.data
  }

  onSaveStateChange?.(true)
  const result = await updateProfile(nextPatch)
  onSaveStateChange?.(false)

  return { kind: 'profile_saved', result, avatarUpdated: Boolean(avatar) }
}
