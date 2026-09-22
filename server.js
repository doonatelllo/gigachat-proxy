import express from "express";
import https from "https";

const app = express();

app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.send("GigaChat proxy работает");
});

app.post("/token", (req, res) => {
  const authKey = req.body.authKey;

  if (!authKey) {
    return res.status(400).json({
      error: "authKey is required"
    });
  }

  const data = "scope=GIGACHAT_API_PERS";

  const options = {
    hostname: "ngw.devices.sberbank.ru",
    port: 9443,
    path: "/api/v2/oauth",
    method: "POST",

    // Нужно из-за сертификата GigaChat
    rejectUnauthorized: false,

    headers: {
      "Authorization": "Basic " + authKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": crypto.randomUUID(),
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const request = https.request(options, (response) => {
    let body = "";

    response.on("data", (chunk) => {
      body += chunk;
    });

    response.on("end", () => {
      res.status(response.statusCode).send(body);
    });
  });

  request.on("error", (error) => {
    res.status(500).json({
      error: error.message
    });
  });

  request.write(data);
  request.end();
});

app.post("/chat", async (req, res) => {
  try {
    const { accessToken, message } = req.body;

    if (!accessToken || !message) {
      return res.status(400).json({
        error: "accessToken and message are required"
      });
    }

    const response = await fetch(
      "https://api.giga.chat/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          stream: false
        })
      }
    );

    const text = await response.text();

    res.status(response.status).send(text);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
