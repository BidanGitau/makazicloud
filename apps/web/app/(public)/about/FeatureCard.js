import Image from "@/app/_components/AppImage";

export default function FeatureCard({ img, alt, title, description }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition">
      {img ? (
        <Image
          src={img}
          alt={alt}
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
      ) : (
        <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
          Img
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600 text-sm">{description}</p>
    </div>
  );
}
