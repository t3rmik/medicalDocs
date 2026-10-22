/** Fallback if the service worker has not taken control of the installed PWA. */
export async function POST(request: Request) {
  const target = new URL('/', request.url)
  target.searchParams.set('shareFailed', 'handoff')
  return Response.redirect(target, 303)
}
export async function GET(request: Request) {
  return Response.redirect(new URL('/', request.url), 302)
}
