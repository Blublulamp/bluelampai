import crypto from "crypto";


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  const origin =
    req.headers.origin || "";

  const host =
    req.headers.host || "";

  const expectedOrigin =
    `https://${host}`;


  if (
    !origin ||
    origin !== expectedOrigin
  ) {
    return res.status(403).json({
      error: "Invalid request origin"
    });
  }


  const nonce =
    crypto
      .randomBytes(32)
      .toString("base64url");


  res.setHeader(
    "Set-Cookie",
    [
      "globalblamp_telegram_nonce=" +
        encodeURIComponent(nonce),

      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=600"
    ].join("; ")
  );


  return res.status(200).json({
    nonce
  });
}
