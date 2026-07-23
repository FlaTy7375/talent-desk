import { useEffect, useState } from "react";

function usableUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export default function UserAvatar({ url, name, email, className = "" }) {
  const source = usableUrl(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  const label = (name || email || "?").trim();
  const initial = label.charAt(0).toUpperCase() || "?";

  if (!source || failed) {
    return (
      <span className={className} aria-hidden="true">
        {initial}
      </span>
    );
  }

  return (
    <span className={className}>
      <img src={source} alt="" onError={() => setFailed(true)} />
    </span>
  );
}
