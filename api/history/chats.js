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
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

if (
  req.method === "POST" &&
  !isAllowedOrigin(req)
) {
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


  try {
    const options = {
      method: req.method,

      headers: {
        "Authorization":
          `Bearer ${sessionToken}`
      }
    };


    if (req.method === "POST") {
      options.headers[
        "Content-Type"
      ] = "application/json";

      options.body =
        JSON.stringify(
          req.body || {}
        );
    }


    const response = await fetch(
      `${HISTORY_API}/chats`,
      options
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
            "Chat request failed"
        });
    }


    return res
      .status(response.status)
      .json(data || {});

  } catch (error) {
    console.error(
      "Chats bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not reach chat history service"
    });
  }
}
