export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "apex-matrix-admin",
      timestamp: new Date().toISOString()
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
  );
}
