export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
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
