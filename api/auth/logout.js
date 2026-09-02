function isAllowedOrigin(req) {
  const origin =
    req.headers.origin || "";

  if (!origin) {
    return false;
  }

  const host =
    req.headers.host || "";

  const expectedOrigin =
    `https://${host}`;

  return origin === expectedOrigin;
}


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

if (!isAllowedOrigin(req)) {
  return res.status(403).json({
    error: "Invalid request origin"
  });
}

  /*
    Expire the HttpOnly Telegram
    session cookie immediately.
  */

  res.setHeader(
    "Set-Cookie",
    [
      "globalblamp_session=",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=0"
    ].join("; ")
  );


  return res.status(200).json({
    ok: true
  });
}
