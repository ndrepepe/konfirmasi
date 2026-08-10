import { NextResponse } from "next/server";
import { createPemenuhanPo } from "@/app/actions/reports";

export async function POST(request: Request) {
  const result = await createPemenuhanPo(await request.formData());

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
