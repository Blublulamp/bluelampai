const HISTORY_API =
  "https://history.bluelamp.workers.dev";


function getSessionToken(req) {
  const cookieHeader =
    req.headers.cookie || "";

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] =
      cookie.trim().split("=");

    if (
      name ===
      "globalblamp_session"
    ) {
      const rawValue =
        valueParts.join("=");

      try {
        return decodeURIComponent(
          rawValue
        );
      } catch {
        return "";
      }
    }
  }

  return "";
}

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

const sessionToken =
  getSessionToken(req);


if (sessionToken) {
  try {
    await fetch(
      `${HISTORY_API}/auth/logout`,
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${sessionToken}`
        }
      }
    );

  } catch (error) {
    console.error(
      "Worker logout request failed:",
      error
    );
  }
}


/*
  Always clear the browser cookie.

  Even if the Worker request temporarily
  fails, the local browser session should
  still be removed.
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
