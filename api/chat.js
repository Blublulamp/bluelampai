const HISTORY_API =
  "https://history.bluelamp.workers.dev";

const UPSTREAM_API =
  "https://ai.geraikita.com/v1/chat/completions";

const ATTACHMENT_SERVICE_URL =
  process.env.ATTACHMENT_SERVICE_URL;

const ATTACHMENT_INTERNAL_SECRET =
  process.env.ATTACHMENT_INTERNAL_SECRET;

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

export default async function handler(req, res) {
if (req.method !== "POST") {
  return res.status(405).json({
    error: {
      message: "Method not allowed"
    }
  });
}


if (!isAllowedOrigin(req)) {
  return res.status(403).json({
    error: {
      message: "Invalid request origin"
    }
  });
}

  try {

/*
  The Telegram session is stored only
  in the HttpOnly cookie.

  Browser JavaScript never sends or
  reads the session token directly.
*/

const sessionToken =
  getSessionToken(req);


if (!sessionToken) {
  return res.status(401).json({
    error: {
      message:
        "Missing Telegram session"
    }
  });
}


if (!process.env.INTERNAL_API_SECRET) {
  return res.status(500).json({
    error: {
      message:
        "Internal API secret is not configured"
    }
  });
}


/*
  Step 1:
  Resolve the Telegram user's currently
  linked approved API credential.

  The browser sends the HttpOnly session
  cookie automatically.

  This Vercel server extracts the Telegram
  session and forwards it to the Worker.

  Only this Vercel server knows
  INTERNAL_API_SECRET.
*/

const resolveResponse =
  await fetch(
    `${HISTORY_API}/internal/resolve-api`,
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${sessionToken}`,

        "X-Internal-Secret":
          process.env.INTERNAL_API_SECRET
      }
    }
  );


let resolveData = null;

try {
  resolveData =
    await resolveResponse.json();
} catch {
  resolveData = null;
}


if (!resolveResponse.ok) {
  return res
    .status(resolveResponse.status)
    .json({
      error: {
        message:
          resolveData?.error ||
          "Could not resolve API access"
      }
    });
}


const upstreamApiKey =
  typeof resolveData?.api_key === "string"
    ? resolveData.api_key.trim()
    : "";


if (!upstreamApiKey) {
  return res.status(502).json({
    error: {
      message:
        "Resolved API credential is missing"
    }
  });
}
const attachmentIds =
  Array.isArray(
    req.body?.attachment_ids
  )
    ? req.body.attachment_ids
        .map(
          (id) =>
            String(id || "").trim()
        )
        .filter(Boolean)
    : [];


let accountId = null;


if (attachmentIds.length > 0) {
  if (
    !ATTACHMENT_SERVICE_URL ||
    !ATTACHMENT_INTERNAL_SECRET
  ) {
    return res.status(500).json({
      error: {
        message:
          "Attachment service is not configured"
      }
    });
  }


  const accountResponse =
    await fetch(
      `${HISTORY_API}/internal/resolve-account`,
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${sessionToken}`,

          "X-Internal-Secret":
            process.env.INTERNAL_API_SECRET
        }
      }
    );


  let accountData = null;


  try {
    accountData =
      await accountResponse.json();

  } catch {
    accountData = null;
  }


  if (
    !accountResponse.ok ||
    !accountData?.account?.id
  ) {
    return res
      .status(
        accountResponse.status || 502
      )
      .json({
        error: {
          message:
            accountData?.error ||
            "Could not resolve attachment account"
        }
      });
  }


  accountId =
    String(
      accountData.account.id
    );
}

let upstreamMessages =
  Array.isArray(req.body?.messages)
    ? req.body.messages
        .map(
          (message) => ({
            ...message
          })
        )
    : [];


if (
  attachmentIds.length > 0 &&
  upstreamMessages.length > 0
) {
  const imageParts = [];


  for (const attachmentId of attachmentIds) {
    const fileResponse =
      await fetch(
        `${ATTACHMENT_SERVICE_URL.replace(
          /\/$/,
          ""
        )}/file?id=${encodeURIComponent(
          attachmentId
        )}`,
        {
          method: "GET",

          headers: {
            "x-internal-secret":
              ATTACHMENT_INTERNAL_SECRET,

            "x-account-id":
              accountId
          }
        }
      );


    if (!fileResponse.ok) {
      return res
        .status(fileResponse.status)
        .json({
          error: {
            message:
              "Could not load image attachment"
          }
        });
    }


    const mimeType =
      fileResponse.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";


    if (
      !mimeType.startsWith(
        "image/"
      )
    ) {
      return res.status(400).json({
        error: {
          message:
            "Only image attachments are supported for AI input right now"
        }
      });
    }


    const imageBuffer =
      Buffer.from(
        await fileResponse.arrayBuffer()
      );


    const dataUrl =
      `data:${mimeType};base64,${imageBuffer.toString(
        "base64"
      )}`;


    imageParts.push({
      type: "image_url",

      image_url: {
        url: dataUrl
      }
    });
  }


  const lastUserIndex =
    upstreamMessages
      .map(
        (message) =>
          message?.role
      )
      .lastIndexOf("user");


  if (lastUserIndex >= 0) {
    const originalContent =
      upstreamMessages[
        lastUserIndex
      ].content;


    upstreamMessages[
      lastUserIndex
    ] = {
      ...upstreamMessages[
        lastUserIndex
      ],

      content: [
        {
          type: "text",

          text:
            typeof originalContent ===
            "string"
              ? originalContent
              : ""
        },

        ...imageParts
      ]
    };
  }
}
    /*
      Step 2:
      Only approved accounts reach
      the real AI API.

      stream: true tells the AI API
      to send the answer gradually.
    */

    const response = await fetch(
      UPSTREAM_API,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${upstreamApiKey}`,
          "Accept": "text/event-stream"
        },

       body: JSON.stringify({
         ...req.body,

         messages:
           upstreamMessages,

         attachment_ids:
           undefined,

         stream: true
        })
      }
    );


    /*
      If the upstream AI request fails,
      return its normal error first.
    */

    if (!response.ok) {
      const text =
        await response.text();

      res.status(response.status);

      res.setHeader(
        "Content-Type",
        response.headers.get("content-type") ||
          "application/json"
      );

      return res.send(text);
    }


    if (!response.body) {
      return res.status(502).json({
        error: {
          message: "AI stream was unavailable"
        }
      });
    }


    /*
      Step 3:
      Forward the upstream stream
      directly to the browser.
    */

    res.status(200);

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ||
        "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );


    const reader =
      response.body.getReader();


    while (true) {
      const {
        done,
        value
      } = await reader.read();


      if (done) {
        break;
      }


      res.write(
        Buffer.from(value)
      );
    }


    return res.end();


  } catch (error) {
    console.error(
      "Proxy error:",
      error
    );


    if (!res.headersSent) {
      return res.status(500).json({
        error: {
          message: "Proxy request failed"
        }
      });
    }


    return res.end();
  }
}
