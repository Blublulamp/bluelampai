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
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
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
    let workerUrl =
      `${HISTORY_API}/messages`;


    if (req.method === "GET") {
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


      workerUrl =
        `${HISTORY_API}/messages/` +
        encodeURIComponent(chatId);
    }


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
      workerUrl,
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
            "Message request failed"
        });
    }


    return res
      .status(response.status)
      .json(data || {});

  } catch (error) {
    console.error(
      "Messages bridge error:",
      error
    );

    return res.status(502).json({
      error:
        "Could not reach message history service"
    });
  }
}
