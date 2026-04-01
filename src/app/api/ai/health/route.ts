import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(`${process.env.LLM_SERVER_URL}/health`);

    if (!response.ok) {
      return NextResponse.json({ status: "offline" }, { status: 200 });
    }

    const result = await response.json();
    return NextResponse.json({ status: result.status === "ok" ? "online" : "offline" });
  } catch {
    return NextResponse.json({ status: "offline" });
  }
}