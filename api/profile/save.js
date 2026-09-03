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


function isSameOriginRequest(req) {
  const origin =
    req.headers.origin || "";

  const host =
    req.headers.host || "";


  if (!origin || !host) {
    return false;
  }


  try {
    const originUrl =
      new URL(origin);

    return (
      originUrl.host === host &&
      (
        originUrl.protocol ===
          "https:" ||
        originUrl.hostname ===
          "localhost"
      )
    );

  } catch {
    return false;
  }
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


  if (!isSameOriginRequest(req)) {
    return res.status(403).json({
      error: "Invalid request origin"
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


  const displayName =
    typeof req.body?.display_name ===
      "string"
      ? req.body.display_name
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 50)
      : "";


  const avatarData =
    typeof req.body?.avatar_data ===
      "string"
      ? req.body.avatar_data.trim()
      : "";


  if (!displayName) {
    return res.status(400).json({
      error:
        "Display name is required"
    });
  }


  if (
    avatarData &&
    !avatarData.startsWith(
      "data:image/jpeg;base64,"
    )
  ) {
    return res.status(400).json({
      error:
        "Invalid profile image"
    });
  }


  if (
    avatarData.length >
    500 * 1024
  ) {
    return res.status(413).json({
      error:
        "Profile image is too large"
    });
  }


  try {
    const response = await fetch(
      `${HISTORY_API}/profile`,
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${sessionToken}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            display_name:
              displayName,

            avatar_data:
              avatarData
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
      if (response.status === 401) {
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
      }


      return res
        .status(response.status)
        .json({
          error:
            data?.error ||
            "Could not save profile"
        });
    }


    return res.status(200).json({
      profile:
        data?.profile || null
    });

  } catch (error) {
    console.error(
      "Profile save bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not save profile"
    });
  }
}
