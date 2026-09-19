export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "bluechip-node-core-admin",
      timestamp: new Date().toISOString()
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
  );
}
