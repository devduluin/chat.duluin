const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'http://localhost';

export function workspaceUrl(path = ''): string {
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return `${WORKSPACE_URL.replace(/\/$/, '')}/${trimmed}`;
}