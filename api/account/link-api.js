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


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  const sessionToken =
    getSessionToken(req);


  if (!sessionToken) {
    return res.status(401).json({
      error:
        "Telegram session is missing"
    });
  }


  const apiKey =
    typeof req.body?.api_key === "string"
      ? req.body.api_key.trim()
      : "";


  if (!apiKey) {
    return res.status(400).json({
      error: "Missing API key"
    });
  }


  if (!apiKey.startsWith("gk-")) {
    return res.status(400).json({
      error:
        "API key must start with gk-"
    });
  }


  try {
    const response = await fetch(
      `${HISTORY_API}/account/link-api`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${sessionToken}`
        },

        body: JSON.stringify({
          api_key: apiKey
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
            "This API key cannot be used."
        });
    }


    /*
      Forward only the normal account-link
      result.

      Never expose the Telegram session.
    */

    return res
      .status(response.status)
      .json(data || {});

  } catch (error) {
    console.error(
      "Link API bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not reach account service"
    });
  }
}
