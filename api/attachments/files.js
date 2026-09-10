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


export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
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


  try {
    const accountId =
      await resolveAccount(
        sessionToken,
        historyInternalSecret
      );


    const response =
      await fetch(
        `${attachmentServiceUrl}/files`,
        {
          method: "GET",

          headers: {
            "x-internal-secret":
              internalSecret,

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
            "Could not load attachments"
        });
    }


    return res
      .status(response.status)
      .json(
        data || {}
      );

  } catch (error) {
    console.error(
      "Attachment files bridge error:",
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
