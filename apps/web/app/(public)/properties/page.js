"use client";

import { useEffect, useMemo, useState } from "react";
import { Bed, Building2, Home, MapPin, Search, ArrowRight } from "lucide-react";
import Link from "@/app/_components/AppLink";
import PropertyPageSkeleton from "@/app/_components/PropertySkeleton";
import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";
import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Rental Properties & Vacancies in Kenya",
    description:
      "Browse vacant rental units listed by Makazicloud-managed properties — apartments, bedsitters, studios, and family homes across Kenya. Updated in real time.",
    path: "/properties",
    keywords: [
      "rental properties Kenya",
      "vacant apartments Nairobi",
      "houses to rent Kenya",
      "bedsitter for rent",
      "studio apartment Nairobi",
      "Makazicloud listings",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Properties", path: "/properties" },
    ]),
  });
}

function normalizeAvailableUnitTypes(types) {
  if (Array.isArray(types)) return types.filter(Boolean);
  if (typeof types === "string") {
    return types
      .replace(/[{}]/g, "")
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean);
  }
  return [];
}

const normalizeListingPayload = (payload) =>
  (payload.properties || []).map((property) => ({
    id: property.id,
    name: property.name,
    address: property.address,
    totalUnits: property.totalUnits || 0,
    vacantUnits: property.vacantUnits || 0,
    occupiedUnits: property.occupiedUnits || 0,
    availableUnitTypes: normalizeAvailableUnitTypes(
      property.availableUnitTypes,
    ),
    organization: property.organization || null,
  }));

const fetchPublicListingsPage = async (cursor) => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/public/properties${qs ? `?${qs}` : ""}`,
    {
      cache: "no-store",
      headers: getTenantHeaders(),
      credentials: "include",
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    console.error("Public properties API error:", payload);
    throw new Error(payload.error || "Failed to load properties.");
  }
  return {
    items: normalizeListingPayload(payload),
    nextCursor: payload.nextCursor || null,
  };
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { items, nextCursor: cursor } = await fetchPublicListingsPage();
        if (cancelled) return;
        setProperties(items);
        setNextCursor(cursor);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching public property listings:", err);
          setError("Failed to load properties. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items, nextCursor: cursor } =
        await fetchPublicListingsPage(nextCursor);
      setProperties((prev) => [...prev, ...items]);
      setNextCursor(cursor);
    } catch (err) {
      console.error("Error loading more properties:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const unitTypeOptions = useMemo(
    () =>
      Array.from(new Set(properties.flatMap((p) => p.availableUnitTypes))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [properties],
  );

  const filteredProperties = properties.filter((property) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      property.name?.toLowerCase().includes(query) ||
      property.address?.toLowerCase().includes(query);
    const matchesType =
      filterType === "all" ||
      property.availableUnitTypes.some(
        (type) => type.toLowerCase() === filterType.toLowerCase(),
      );
    return matchesSearch && matchesType;
  });

  const totalVacant = filteredProperties.reduce(
    (sum, p) => sum + p.vacantUnits,
    0,
  );

  if (loading) return <PropertyPageSkeleton cards={6} />;

  if (error) {
    return (
      <div className="bg-white">
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl border border-stone-200 p-12 text-center">
            <p className="section-label">— Error —</p>
            <h2
              className="mt-3 text-base font-black uppercase tracking-tight text-black sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cannot load properties.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-black/55">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 inline-flex min-h-11 items-center gap-2 bg-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
            >
              Try Again
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full border border-stone-300 bg-white px-4 py-3 text-sm text-black placeholder:text-black/35 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none hover:border-stone-400 transition-all";

  return (
    <div className="bg-white">
      <section className="bg-blue-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="section-label !text-white/45">— Public Listings —</p>
            <h1
              className="mt-3 text-4xl font-black uppercase leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Browse Rentals.
              <br />
              <span className="text-white/30">Find your next home.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
              Properties with current vacancies, ready to view. Search, filter,
              and book a visit.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"
                strokeWidth={1.8}
              />
              <input
                type="text"
                placeholder="Search by name or location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={inputClass}
            >
              <option value="all">All Unit Types</option>
              {unitTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {properties.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-8 border-t border-stone-200 pt-6">
              <div className="flex items-baseline gap-3">
                <p
                  className="font-mono text-2xl font-black tabular-nums text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {filteredProperties.length}
                </p>
                <p className="section-label">Properties</p>
              </div>
              <div className="h-8 w-px bg-stone-200" />
              <div className="flex items-baseline gap-3">
                <p
                  className="font-mono text-2xl font-black tabular-nums text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {totalVacant}
                </p>
                <p className="section-label">Vacant Units</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {filteredProperties.length === 0 ? (
          <div className="mx-auto max-w-xl border border-stone-200 p-12 text-center">
            <p className="section-label">— Nothing matches —</p>
            <h2
              className="mt-3 text-base font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {searchQuery || filterType !== "all"
                ? "No matches found."
                : "No vacancies right now."}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-black/55">
              {searchQuery || filterType !== "all"
                ? "Adjust your search to find more matches."
                : "Check back soon — new listings post regularly."}
            </p>
            {(searchQuery || filterType !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="mt-8 inline-flex min-h-11 items-center gap-2 bg-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-2 xl:grid-cols-3">
              {filteredProperties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                />
              ))}
            </div>
            {nextCursor && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="border border-stone-300 px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-black/75 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PropertyCard({ property, index }) {
  const { id, name, address, totalUnits, vacantUnits, availableUnitTypes } =
    property;

  return (
    <article
      className="group flex flex-col bg-white p-7 transition-colors hover:bg-stone-50"
      style={{
        animation: `fadeUp 0.5s ease-out ${index * 60}ms both`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="section-label">
            — Listing No. {String(index + 1).padStart(2, "0")} —
          </p>
          <h3
            className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {name}
          </h3>
          {address && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-black/55">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
              <span className="truncate">{address}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 border-2 border-blue-700 px-4 py-3 text-center">
          <p
            className="font-mono text-2xl font-black tabular-nums leading-none text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {vacantUnits}
          </p>
          <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.22em] text-black/55">
            Vacant
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 divide-x divide-stone-200 border-y border-stone-200">
        <div className="px-4 py-4 text-center">
          <p
            className="font-mono text-xl font-black tabular-nums text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {totalUnits}
          </p>
          <p className="section-label mt-1">Total Units</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p
            className="font-mono text-xl font-black tabular-nums text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {totalUnits - vacantUnits}
          </p>
          <p className="section-label mt-1">Occupied</p>
        </div>
      </div>

      {availableUnitTypes.length > 0 && (
        <div className="mt-6">
          <p className="section-label">— Open Unit Types —</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {availableUnitTypes.map((unitType) => (
              <span
                key={unitType}
                className="inline-flex items-center border border-stone-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black/70"
              >
                {unitType}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/properties/${id}`}
        className="group/btn mt-8 inline-flex min-h-11 items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
      >
        View Vacant Units
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
      </Link>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}
