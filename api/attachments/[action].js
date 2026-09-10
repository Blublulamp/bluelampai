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


function getAction(req) {
  const rawAction =
    req.query?.action;

  if (Array.isArray(rawAction)) {
    return String(
      rawAction[0] || ""
    ).trim();
  }

  return String(
    rawAction || ""
  ).trim();
}


function getEnvironment() {
  return {
    attachmentServiceUrl:
      String(
        process.env
          .ATTACHMENT_SERVICE_URL ||
        ""
      )
        .trim()
        .replace(/\/+$/, ""),

    attachmentInternalSecret:
      String(
        process.env
          .ATTACHMENT_INTERNAL_SECRET ||
        ""
      ).trim(),

    historyInternalSecret:
      String(
        process.env
          .INTERNAL_API_SECRET ||
        ""
      ).trim()
  };
}


async function handleUpload(
  req,
  res,
  accountId,
  attachmentServiceUrl,
  attachmentInternalSecret
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


  const rawBody =
    await readRawBody(req);


  const headers = {
    "Content-Type":
      contentType,

    "x-internal-secret":
      attachmentInternalSecret,

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
        body: rawBody
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
}


async function handleFile(
  req,
  res,
  accountId,
  attachmentServiceUrl,
  attachmentInternalSecret
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


  const response =
    await fetch(
      `${attachmentServiceUrl}/file?id=${encodeURIComponent(id)}`,
      {
        method:
          req.method,

        headers: {
          "x-internal-secret":
            attachmentInternalSecret,

          "x-account-id":
            accountId
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
}


async function handleJsonGet(
  res,
  accountId,
  attachmentServiceUrl,
  attachmentInternalSecret,
  upstreamPath,
  fallbackError
) {
  const response =
    await fetch(
      `${attachmentServiceUrl}/${upstreamPath}`,
      {
        method: "GET",

        headers: {
          "x-internal-secret":
            attachmentInternalSecret,

          "x-account-id":
            accountId
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
          fallbackError
      });
  }


  return res
    .status(response.status)
    .json(
      data || {}
    );
}


export default async function handler(
  req,
  res
) {
  const action =
    getAction(req);


  if (
    action !== "upload" &&
    action !== "file" &&
    action !== "files" &&
    action !== "usage"
  ) {
    return res.status(404).json({
      error:
        "Attachment route not found"
    });
  }


  if (
    (action === "upload" &&
      req.method !== "POST") ||
    (action === "file" &&
      req.method !== "GET" &&
      req.method !== "DELETE") ||
    ((action === "files" ||
      action === "usage") &&
      req.method !== "GET")
  ) {
    return res.status(405).json({
      error:
        "Method not allowed"
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


  const {
    attachmentServiceUrl,
    attachmentInternalSecret,
    historyInternalSecret
  } = getEnvironment();


  if (
    !attachmentServiceUrl ||
    !attachmentInternalSecret
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


  try {
    const accountId =
      await resolveAccount(
        sessionToken,
        historyInternalSecret
      );


    if (action === "upload") {
      return await handleUpload(
        req,
        res,
        accountId,
        attachmentServiceUrl,
        attachmentInternalSecret
      );
    }


    if (action === "file") {
      return await handleFile(
        req,
        res,
        accountId,
        attachmentServiceUrl,
        attachmentInternalSecret
      );
    }


    if (action === "files") {
      return await handleJsonGet(
        res,
        accountId,
        attachmentServiceUrl,
        attachmentInternalSecret,
        "files",
        "Could not load attachments"
      );
    }


    return await handleJsonGet(
      res,
      accountId,
      attachmentServiceUrl,
      attachmentInternalSecret,
      "usage",
      "Could not load attachment usage"
    );

  } catch (error) {
    console.error(
      "Attachment bridge error:",
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
