// Web keeps the same journal across reloads without asking for a name.
export async function journalIdentity() {
  const key = 'fishnerd-journal';
  const saved = localStorage.getItem(key);
  if (saved && /^[a-z0-9_-]{1,32}$/.test(saved)) return saved;
  const name = `angler_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, name);
  return name;
}
