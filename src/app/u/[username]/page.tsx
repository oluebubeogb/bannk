"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profiles/${username}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setProfile(d);
      });
  }, [username]);

  if (notFound) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5">
        <p className="text-[var(--text-muted)] mb-4">User not found</p>
        <Link href="/" className="text-[var(--accent-ink)]">
          Go home
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center px-5 pt-16 safe-top">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-3xl font-bold text-[var(--accent-ink)] mx-auto mb-4">
          {(profile.displayName || profile.username || "?").charAt(0).toUpperCase()}
        </div>
        <h1 className="text-xl font-bold">{profile.displayName}</h1>
        <p className="text-[var(--accent-ink)] mb-2">@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm text-[var(--text-muted)] mb-4">{profile.bio}</p>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          Home currency · {profile.homeCurrency}
        </p>
        <Link
          href="/send"
          className="mt-6 inline-flex h-11 px-6 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-sm items-center"
        >
          Send money
        </Link>
      </div>
      <Link href="/" className="mt-8 text-sm text-[var(--text-muted)]">
        Bannk
      </Link>
    </div>
  );
}
