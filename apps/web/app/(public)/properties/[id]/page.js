"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bed,
  Building2,
  Layers3,
  MapPin,
} from "lucide-react";
import Link from "@/app/_components/AppLink";
import { useParams, useRouter } from "@/app/_hooks/navigation";
import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";
import { StatCard, UnitCard } from "../_components/PropertyDetailCards";
import {
  fetchPublicPropertyDetails,
  getUnitKey,
} from "../_lib/publicProperties";

export function meta({ params }) {
  const id = params?.id || "";
  return buildMeta({
    title: "Property Details & Vacancies",
    description:
      "View available units, unit types, occupancy, and contact details for this property listed on Makazicloud.",
    path: `/properties/${id}`,
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Properties", path: "/properties" },
      { name: "Listing", path: `/properties/${id}` },
    ]),
  });
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const details = await fetchPublicPropertyDetails(propertyId);
        setProperty(details.property);
        setUnits(details.units);
      } catch (err) {
        console.error("Error fetching public property vacancies:", err);
        setProperty(null);
        setUnits([]);
        setError(err.message || "Failed to load property details.");
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) fetchPropertyDetails();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-white">
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="section-label animate-pulse">— Loading —</p>
            <p
              className="mt-3 text-base font-black uppercase tracking-tight text-black/30"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Fetching property…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white">
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl border border-stone-200 p-12 text-center">
            <p className="section-label">— Unavailable —</p>
            <h2
              className="mt-3 text-base font-black uppercase tracking-tight text-black sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Property Unavailable.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-black/55">
              {error}
            </p>
            <button
              onClick={() => router.push("/properties")}
              className="mt-8 inline-flex min-h-11 items-center gap-2 bg-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Properties
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <section className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 pt-8 sm:px-6 lg:px-8">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back to Properties
          </Link>
        </div>

        {property && (
          <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="section-label">— Public Listing —</p>
                <h1
                  className="mt-3 break-words text-xl font-black uppercase leading-tight tracking-tight text-black sm:text-2xl lg:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {property.name}
                </h1>
                {property.address && (
                  <p className="mt-4 flex items-center gap-2 text-base text-black/55 sm:text-lg">
                    <MapPin
                      className="h-4 w-4 flex-shrink-0"
                      strokeWidth={1.8}
                    />
                    {property.address}
                  </p>
                )}

                {property.unitTypes?.length > 0 && (
                  <div className="mt-8">
                    <p className="section-label">— Open Unit Types —</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {property.unitTypes.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center border border-stone-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-px self-start bg-stone-200 lg:col-span-5">
                <StatCard
                  icon={Building2}
                  label="Vacant"
                  value={property.vacantUnitsInProperty}
                />
                <StatCard
                  icon={Bed}
                  label="Unit Types"
                  value={property.unitTypes?.length || 0}
                />
                <StatCard
                  icon={Layers3}
                  label="Blocks"
                  value={property.blocksCount || 0}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="section-label">— Available Now —</p>
            <h2
              className="mt-3 text-base font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Vacant Units.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/55">
              Current vacancies, ready for viewing. Public detail is limited to
              unit location and availability.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center gap-2 bg-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            Enquire About This
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {units.length === 0 ? (
          <div className="mx-auto mt-12 max-w-xl border border-stone-200 p-12 text-center">
            <p className="section-label">— Empty —</p>
            <h3
              className="mt-3 text-base font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No vacancies right now.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-black/55">
              Check back soon — vacancies update regularly.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-2">
            {units.map((unit, idx) => (
              <UnitCard key={getUnitKey(unit)} unit={unit} index={idx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
