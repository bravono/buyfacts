import { NextResponse } from "next/server";
import { deleteAuthSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await deleteAuthSession();
    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log out." },
      { status: 500 }
    );
  }
}
