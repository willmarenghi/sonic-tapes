import Link from "next/link";

export function NavBar({ userName }: { userName: string }) {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-neutral-100">
          Sonic Tapes
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">{userName}</span>
          <Link
            href="/upload"
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            New idea
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="text-sm text-neutral-400 hover:text-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
