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


async function resolveAccount(
  sessionToken,
  historyInternalSecret
) {
  const response = await fetch(
    `${HISTORY_API}/internal/resolve-account`,
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${sessionToken}`,

        "X-Internal-Secret":
          historyInternalSecret
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
        "Could not resolve API account"
      );

    error.status =
      response.status;

    throw error;
  }


  const accountId =
    String(
      data?.account?.id || ""
    ).trim();


  if (!accountId) {
    const error =
      new Error(
        "Resolved API account is missing"
      );

    error.status = 502;

    throw error;
  }


  return accountId;
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


const historyInternalSecret =
  String(
    process.env
      .INTERNAL_API_SECRET ||
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
if (!historyInternalSecret) {
  return res.status(500).json({
    error:
      "Internal API secret is not configured"
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
  const accountId =
    await resolveAccount(
      sessionToken,
      historyInternalSecret
    );


  const rawBody =
      await readRawBody(req);


const headers = {
  "Content-Type":
    contentType,

  "x-internal-secret":
    internalSecret,

  "x-account-id":
    accountId
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
