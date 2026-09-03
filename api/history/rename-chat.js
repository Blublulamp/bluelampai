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


  if (!sessionToken) {
    return res.status(401).json({
      error:
        "Telegram session is missing"
    });
  }


  const chatId =
    typeof req.body?.chat_id ===
    "string"
      ? req.body.chat_id.trim()
      : "";


  const title =
    typeof req.body?.title ===
    "string"
      ? req.body.title
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60)
      : "";


  if (!chatId) {
    return res.status(400).json({
      error: "Missing chat_id"
    });
  }


  if (!title) {
    return res.status(400).json({
      error: "Chat title is required"
    });
  }


  try {
    const response = await fetch(
      `${HISTORY_API}/chats/` +
        encodeURIComponent(chatId) +
        "/rename",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${sessionToken}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          title
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
            "Could not rename chat"
        });
    }


    return res
      .status(response.status)
      .json(
        data || {
          ok: true,

          chat: {
            id: chatId,
            title
          }
        }
      );

  } catch (error) {
    console.error(
      "Rename chat bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not reach chat history service"
    });
  }
}
