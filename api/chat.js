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
    */

    const response = await fetch(
      UPSTREAM_API,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": authorization
        },

        body: JSON.stringify(req.body)
      }
    );


    const text =
      await response.text();


    res.status(response.status);

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ||
        "application/json"
    );


    return res.send(text);


  } catch (error) {
    console.error(
      "Proxy error:",
      error
    );

    return res.status(500).json({
      error: {
        message: "Proxy request failed"
      }
    });
  }
}
