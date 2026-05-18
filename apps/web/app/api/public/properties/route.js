import { NextResponse } from "next/server";
import { getPublicPropertyListings } from "@/app/_lib/publicListings";

export const revalidate = 60;

export async function GET() {
  try {
    const properties = await getPublicPropertyListings();
    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Failed to load public property listings:", error);
    return NextResponse.json(
      { error: "Failed to load properties." },
      { status: 500 },
    );
  }
}
