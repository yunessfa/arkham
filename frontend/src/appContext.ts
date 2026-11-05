import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
export const Context = createContext<any>({});
export function useApp() {
  return useContext(Context);
}
export function useData(path: string | null) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  const previous = useRef(path);
  useEffect(() => {
    if (path === null) return;
    let alive = true;
    if (previous.current !== path) {
      setData(null);
      previous.current = path;
    }
    setError("");
    api(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}
