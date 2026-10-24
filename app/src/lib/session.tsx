import { createContext, useContext, useState, type ReactNode } from 'react';

const Session = createContext<{ username: string | null; setUsername: (value: string | null) => void }>({ username: null, setUsername: () => {} });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  return <Session.Provider value={{ username, setUsername }}>{children}</Session.Provider>;
}
export const useSession = () => useContext(Session);
