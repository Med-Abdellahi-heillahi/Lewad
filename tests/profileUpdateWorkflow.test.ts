import { describe, expect, it, vi } from 'vitest'
import { saveProfileWithOptionalAvatar } from '../src/lib/profileUpdateWorkflow'

describe('saveProfileWithOptionalAvatar', () => {
  it('does not save a profile or replace its existing avatar when upload fails', async () => {
    const uploadAvatar = vi.fn().mockResolvedValue({ data: null, error: 'upload_failed' })
    const updateProfile = vi.fn()

    const result = await saveProfileWithOptionalAvatar({
      patch: { full_name: 'Updated name' },
      avatar: {} as File,
      uploadAvatar,
      updateProfile,
    })

    expect(result).toEqual({ kind: 'avatar_failed', error: 'upload_failed' })
    expect(uploadAvatar).toHaveBeenCalledOnce()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('adds the new avatar URL only after a successful upload and preserves a partial patch', async () => {
    const uploadAvatar = vi.fn().mockResolvedValue({ data: 'https://cdn.example.test/avatars/user/avatar-1.jpg', error: null })
    const updateProfile = vi.fn().mockResolvedValue({ data: null, error: 'duplicate_phone' })
    const uploadStates: boolean[] = []
    const saveStates: boolean[] = []

    const result = await saveProfileWithOptionalAvatar({
      patch: { phone: '23456789' },
      avatar: {} as File,
      uploadAvatar,
      updateProfile,
      onUploadStateChange: (value) => uploadStates.push(value),
      onSaveStateChange: (value) => saveStates.push(value),
    })

    expect(updateProfile).toHaveBeenCalledWith({
      phone: '23456789',
      avatar_url: 'https://cdn.example.test/avatars/user/avatar-1.jpg',
    })
    expect(uploadStates).toEqual([true, false])
    expect(saveStates).toEqual([true, false])
    expect(result).toEqual({
      kind: 'profile_saved',
      avatarUpdated: true,
      result: { data: null, error: 'duplicate_phone' },
    })
  })
})
