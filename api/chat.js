const HISTORY_API =
  "https://history.bluelamp.workers.dev";

const UPSTREAM_API =
  "https://ai.geraikita.com/v1/chat/completions";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: {
        message: "Method not allowed"
      }
    });
  }


  try {
    const authorization =
      req.headers.authorization;


    if (!authorization) {
      return res.status(401).json({
        error: {
          message: "Missing API key"
        }
      });
    }


    /*
      Step 1:
      Check whether this gk account
      is approved and active.
    */

    const accountResponse = await fetch(
      `${HISTORY_API}/account`,
      {
        method: "POST",

        headers: {
          "Authorization": authorization
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


    if (!accountResponse.ok) {
      return res
        .status(accountResponse.status)
        .json({
          error: {
            message:
              accountData?.error ||
              "This API key is not authorized"
          }
        });
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
          "Authorization": authorization,
          "Accept": "text/event-stream"
        },

        body: JSON.stringify({
          ...req.body,
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
