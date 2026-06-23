export function getGitCommitSha(): string | null {
  const sha = process.env.GIT_COMMIT_SHA?.trim()
  return sha || null
}
