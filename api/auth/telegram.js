const HISTORY_API =
  "https://history.bluelamp.workers.dev";


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
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

        body: JSON.stringify(
          req.body || {}
        )
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
