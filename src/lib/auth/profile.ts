interface AuthProfileSource {
  id: string;
  email?: string | null;
  user_metadata: Record<string, unknown>;
}

function getMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function mapUserToProfile(
  user: AuthProfileSource,
  updatedAt = new Date().toISOString(),
) {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: getMetadataString(user.user_metadata, ["full_name", "name"]),
    avatar_url: getMetadataString(user.user_metadata, ["avatar_url", "picture"]),
    updated_at: updatedAt,
  };
}
