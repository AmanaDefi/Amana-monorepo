import Link from "next/link";

export default function Security() {
  return (
      <>
          <h1 className="text-4xl font-bold">Security</h1>
          <p className="text-2xl text-zinc-600 mt-4">Coming Soon</p>
          <Link href="/" className="mt-4 text-blue-500 hover:underline">
              Take me back to Amana
          </Link>
      </>
  );
}
