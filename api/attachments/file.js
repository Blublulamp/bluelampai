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


  return telegramId;
}


export default async function handler(
  req,
  res
) {
  if (
    req.method !== "GET" &&
    req.method !== "DELETE"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed"
    });
  }


  if (
    req.method === "DELETE" &&
    !isAllowedOrigin(req)
  ) {
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


  const id =
    String(
      req.query?.id || ""
    ).trim();


  if (!id) {
    return res.status(400).json({
      error:
        "Attachment ID is missing"
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


  try {
    const telegramId =
      await getTelegramUser(
        sessionToken
      );


    const response =
      await fetch(
        `${attachmentServiceUrl}/file?id=${encodeURIComponent(id)}`,
        {
          method:
            req.method,

          headers: {
            "x-internal-secret":
              internalSecret,

            "x-telegram-id":
              telegramId
          }
        }
      );


    if (req.method === "DELETE") {
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
              "Attachment delete failed"
          });
      }


      return res
        .status(response.status)
        .json(
          data || {}
        );
    }


    if (!response.ok) {
      let data = null;

      try {
        data =
          await response.json();

      } catch {
        data = null;
      }


      return res
        .status(response.status)
        .json({
          error:
            data?.error ||
            "Attachment request failed"
        });
    }


    const contentType =
      response.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";


    const contentDisposition =
      response.headers.get(
        "content-disposition"
      );


    res.setHeader(
      "Content-Type",
      contentType
    );


    if (contentDisposition) {
      res.setHeader(
        "Content-Disposition",
        contentDisposition
      );
    }


    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );


    const arrayBuffer =
      await response.arrayBuffer();


    return res
      .status(response.status)
      .send(
        Buffer.from(
          arrayBuffer
        )
      );

  } catch (error) {
    console.error(
      "Attachment file bridge error:",
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
