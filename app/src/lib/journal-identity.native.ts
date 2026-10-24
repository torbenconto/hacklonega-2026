import { File, Paths } from 'expo-file-system';

export async function journalIdentity() {
  const file = new File(Paths.document, 'fishnerd-journal.txt');
  if (file.exists) {
    const saved = (await file.text()).trim();
    if (/^[a-z0-9_-]{1,32}$/.test(saved)) return saved;
  }
  const name = `angler_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await file.write(name);
  return name;
}
