import Link from "@/app/_components/AppLink";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-md rounded-xl p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Not Found</h1>

        <p className="text-gray-600 mb-6">
          Page you are looking for does not exist.
        </p>

        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
