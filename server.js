import express from "express";
import https from "https";
import crypto from "crypto";

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

app.post("/chat", (req, res) => {
  const { accessToken, message } = req.body;

  if (!accessToken || !message) {
    return res.status(400).json({
      error: "accessToken and message are required"
    });
  }

  const data = JSON.stringify({
   model: "GigaChat-2",
    messages: [
      {
        role: "user",
        content: message
      }
    ],
    stream: false
  });

  const options = {
    hostname: "api.giga.chat",
    port: 443,
    path: "/v1/chat/completions",
    method: "POST",

    rejectUnauthorized: false,

headers: {
  "Authorization": "Bearer " + accessToken,
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "avito-bot",
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
app.post("/image-test", (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({
      error: "imageBase64 is required"
    });
   
  }

  const imageBuffer = Buffer.from(imageBase64, "base64");

  res.json({
    success: true,
    size: imageBuffer.length
  });
});
app.post("/vision", (req, res) => {
  const { accessToken, imageBase64 } = req.body;

  if (!accessToken || !imageBase64) {
    return res.status(400).json({
      error: "accessToken and imageBase64 are required"
    });
  }

  const imageBuffer = Buffer.from(imageBase64, "base64");
const boundary = "----GigaChatBoundary" + crypto.randomUUID();

const beforeFile =
  "--" + boundary + "\r\n" +
  'Content-Disposition: form-data; name="file"; filename="avito.jpg"\r\n' +
  "Content-Type: image/jpeg\r\n\r\n";

const afterFile =
  "\r\n--" + boundary + "\r\n" +
  'Content-Disposition: form-data; name="purpose"\r\n\r\n' +
  "general\r\n" +
  "--" + boundary + "--\r\n";

const multipartBody = Buffer.concat([
  Buffer.from(beforeFile),
  imageBuffer,
  Buffer.from(afterFile)
]);
 const options = {
  hostname: "api.giga.chat",
  port: 443,
  path: "/v1/files",
  method: "POST",
  rejectUnauthorized: false,
  headers: {
    "Authorization": "Bearer " + accessToken,
    "Content-Type": "multipart/form-data; boundary=" + boundary,
    "Accept": "application/json",
    "User-Agent": "avito-bot",
    "Content-Length": multipartBody.length
  }
};

const request = https.request(options, (response) => {
  let body = "";

  response.on("data", (chunk) => {
    body += chunk;
  });

  response.on("end", () => {
  if (response.statusCode !== 200) {
    return res.status(response.statusCode).send(body);
  }

 const fileData = JSON.parse(body);
const fileId = fileData.id;

const chatData = JSON.stringify({
  model: "GigaChat-2",
  messages: [
    {
      role: "user",
      content:
        "Посмотри на скриншот статистики Avito. " +
        "Верни ТОЛЬКО JSON без пояснений в формате: " +
        '{"views":123,"contacts":45,"orders":6}. ' +
        "views = просмотры, contacts = контакты, orders = заказы.",
      attachments: [fileId]
    }
  ],
  stream: false
});

const chatOptions = {
  hostname: "api.giga.chat",
  port: 443,
  path: "/v1/chat/completions",
  method: "POST",
  rejectUnauthorized: false,
  headers: {
    "Authorization": "Bearer " + accessToken,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "avito-bot",
    "Content-Length": Buffer.byteLength(chatData)
  }
};

const chatRequest = https.request(chatOptions, (chatResponse) => {
  let chatBody = "";

  chatResponse.on("data", (chunk) => {
    chatBody += chunk;
  });

  chatResponse.on("end", () => {
    res.status(chatResponse.statusCode).send(chatBody);
  });
});

chatRequest.on("error", (error) => {
  res.status(500).json({
    error: error.message
  });
});

chatRequest.write(chatData);
chatRequest.end();
});
});

request.on("error", (error) => {
  res.status(500).json({
    error: error.message
  });
});

request.write(multipartBody);
request.end();
});
app.post("/models", (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      error: "accessToken is required"
    });
  }

  const options = {
    hostname: "api.giga.chat",
    port: 443,
    path: "/v1/models",
    method: "GET",
    rejectUnauthorized: false,
    headers: {
  "Authorization": "Bearer " + accessToken,
  "Accept": "application/json",
  "User-Agent": "avito-bot"
}
  };

  const request = https.request(options, (response) => {
    let body = "";

    response.on("data", chunk => {
      body += chunk;
    });

    response.on("end", () => {
      res.status(response.statusCode).send(body);
    });
  });

  request.on("error", error => {
    res.status(500).json({
      error: error.message
    });
  });

  request.end();
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
