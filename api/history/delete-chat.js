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
  if (req.method !== "DELETE") {
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


  const chatId =
    typeof req.query?.chat_id ===
    "string"
      ? req.query.chat_id.trim()
      : "";


  if (!chatId) {
    return res.status(400).json({
      error: "Missing chat_id"
    });
  }


  try {
    const response = await fetch(
      `${HISTORY_API}/chats/` +
        encodeURIComponent(chatId),
      {
        method: "DELETE",

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
            "Could not delete chat"
        });
    }


    return res
      .status(response.status)
      .json(data || {
        ok: true
      });

  } catch (error) {
    console.error(
      "Delete chat bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not reach chat history service"
    });
  }
}
