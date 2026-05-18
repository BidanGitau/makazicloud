import { NextResponse } from "next/server";
import { getPublicPropertyDetails } from "@/app/_lib/publicListings";

export const revalidate = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid property ID." }, { status: 400 });
  }

  try {
    const data = await getPublicPropertyDetails(id);

    if (!data || data.units.length === 0) {
      return NextResponse.json(
        { error: "This property is not currently listed with public vacancies." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load public property detail:", error);
    return NextResponse.json(
      { error: "Failed to load property details." },
      { status: 500 },
    );
  }
}
