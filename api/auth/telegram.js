const HISTORY_API =
  "https://history.bluelamp.workers.dev";

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

function getTelegramNonce(req) {
  const cookieHeader =
    req.headers.cookie || "";

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] =
      cookie.trim().split("=");

    if (
      name ===
      "globalblamp_telegram_nonce"
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
const expectedNonce =
  getTelegramNonce(req);


if (!expectedNonce) {
  return res.status(400).json({
    error:
      "Telegram login nonce is missing or expired"
  });
}
  try {
    const response = await fetch(
      `${HISTORY_API}/auth/telegram`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          ...(req.body || {}),

          expected_nonce:
            expectedNonce
        })
      }
    );


    let data = null;

    try {
      data =
        await response.json();

    } catch {
      data = null;
    }


    if (!response.ok) {
      return res
        .status(response.status)
        .json({
          error:
            data?.error ||
            "Telegram login failed"
        });
    }


    const sessionToken =
      typeof data?.session_token ===
      "string"
        ? data.session_token.trim()
        : "";


    if (!sessionToken) {
      return res.status(502).json({
        error:
          "Telegram session was not returned"
      });
    }


    /*
      Store the Telegram session in an
      HttpOnly cookie.

      JavaScript in the browser cannot
      read this cookie.
    */

    res.setHeader(
      "Set-Cookie",
      [
        "globalblamp_session=" +
          encodeURIComponent(
            sessionToken
          ),

        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=2592000"
      ].join("; ")
    );


    /*
      Never return session_token
      to browser JavaScript.
    */

    return res.status(200).json({
      ok: true,

      user:
        data?.user || null,

      api_access:
        data?.api_access || null
    });

  } catch (error) {
    console.error(
      "Telegram auth bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not complete Telegram login"
    });
  }
}
