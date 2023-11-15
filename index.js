import express, { json } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import axios from "axios";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import dotenv from "dotenv"

dotenv.config();

const PORT = 3000;
const API_KEY = process.env['API_KEY'];
const app = express();
const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) { }
    }

    return ''; // use external default escaping
  }
}
);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const messages_hist = [];
app.use(json());

app.get("/", (_, res) => {
  res.sendFile(path.join(dirname, "index.html"));
});

app.get("/all", (_, res) => {
  res.json(messages_hist)
})

app.post("/msg", async (req, res) => {

  if (!req.body.msg) {
    res.sendStatus(403);
    return;
  }
  messages_hist.push({ role: 'user', content: req.body.msg });

  const { data } = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4-1106-preview",
    messages: messages_hist.filter((obj) => obj.role !== "error"),
    temperature: 0
  }, {
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  })
  if (data.error)
    messages_hist.push({ role: 'error', content: data.error.message });
  else
    messages_hist.push({ role: 'assistant', content: md.render(data.choices[0].message.content) });
  res.json(messages_hist);
});

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
