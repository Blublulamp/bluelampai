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


async function getTelegramUser(
  sessionToken
) {
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
    const error =
      new Error(
        data?.error ||
        "Could not verify Telegram session"
      );

    error.status =
      response.status;

    throw error;
  }


  const telegramId =
    String(
      data?.user?.id || ""
    ).trim();


  if (!telegramId) {
    const error =
      new Error(
        "Telegram user ID is missing"
      );

    error.status = 401;

    throw error;
  }


  return {
    telegramId,
    user:
      data?.user || null
  };
}


async function readRawBody(req) {
  const chunks = [];

  for await (
    const chunk of req
  ) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }


  return Buffer.concat(
    chunks
  );
}


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Method not allowed"
    });
  }


  if (!isAllowedOrigin(req)) {
    return res.status(403).json({
      error:
        "Invalid request origin"
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


  const attachmentServiceUrl =
    String(
      process.env
        .ATTACHMENT_SERVICE_URL ||
      ""
    )
      .trim()
      .replace(/\/+$/, "");


  const internalSecret =
    String(
      process.env
        .ATTACHMENT_INTERNAL_SECRET ||
      ""
    ).trim();


  if (
    !attachmentServiceUrl ||
    !internalSecret
  ) {
    console.error(
      "Attachment service environment variables are missing."
    );

    return res.status(500).json({
      error:
        "Attachment service is not configured"
    });
  }


  const contentType =
    req.headers[
      "content-type"
    ] || "";


  if (
    !contentType
      .toLowerCase()
      .startsWith(
        "multipart/form-data"
      )
  ) {
    return res.status(400).json({
      error:
        "Expected multipart form upload"
    });
  }


  try {
    const {
      telegramId
    } =
      await getTelegramUser(
        sessionToken
      );


    const rawBody =
      await readRawBody(req);


    const headers = {
      "Content-Type":
        contentType,

      "x-internal-secret":
        internalSecret,

      "x-telegram-id":
        telegramId
    };


    const chatIdHeader =
      req.headers[
        "x-chat-id"
      ];


    if (
      typeof chatIdHeader ===
        "string" &&
      chatIdHeader.trim()
    ) {
      headers[
        "x-chat-id"
      ] =
        chatIdHeader.trim();
    }


    const response =
      await fetch(
        `${attachmentServiceUrl}/upload`,
        {
          method: "POST",

          headers,

          body:
            rawBody
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
            "Attachment upload failed"
        });
    }


    return res
      .status(response.status)
      .json(
        data || {}
      );

  } catch (error) {
    console.error(
      "Attachment upload bridge error:",
      error
    );


    const status =
      Number(
        error?.status
      ) || 502;


    return res
      .status(status)
      .json({
        error:
          error?.message ||
          "Could not reach attachment service"
      });
  }
}
