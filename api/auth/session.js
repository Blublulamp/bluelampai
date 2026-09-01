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
  if (req.method !== "GET") {
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


  try {
    const response = await fetch(
      `${HISTORY_API}/auth/session`,
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${sessionToken}`
        }
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
            "Could not restore Telegram session"
        });
    }


    return res.status(200).json({
      user:
        data?.user || null,

      api_access:
        data?.api_access || null
    });

  } catch (error) {
    console.error(
      "Telegram session bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not check Telegram session"
    });
  }
}
