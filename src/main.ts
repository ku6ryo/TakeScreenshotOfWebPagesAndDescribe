import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

const urls = [
    "https://nytimes.com",
    "https://openai.com/pricing",
    "https://twitter.com/BosoTokyo/status/1726432249669976133",
    "https://twitter.com/fukusta343/status/1732377110092877826",
    "https://www.amazon.co.jp/2024%E3%82%B3%E3%82%B9%E3%83%91%E5%A4%A7%E8%B3%9E%EF%BC%86%E9%87%91%E8%B3%9E%E3%80%91-SOUNDPEATS-%E3%83%8E%E3%82%A4%E3%82%BA%E3%82%AD%E3%83%A3%E3%83%B3%E3%82%BB%E3%83%AA%E3%83%B3%E3%82%B0-Snapdragon-%E3%82%B5%E3%82%A6%E3%83%B3%E3%83%89%E3%83%94%E3%83%BC%E3%83%84/dp/B0CHS38JNJ/?_encoding=UTF8&pd_rd_w=AcC5K&content-id=amzn1.sym.4df119b0-3966-4366-b65e-92916c7fe1e6&pf_rd_p=4df119b0-3966-4366-b65e-92916c7fe1e6&pf_rd_r=388F5KW1PXVVNG0YGFA2&pd_rd_wg=LDnXj&pd_rd_r=04484d9f-4033-416d-8416-48d53e426f5b&ref_=pd_gw_deals_4s_t1",
    "https://tabelog.com/",
    "https://tabelog.com/aichi/A2304/A230402/23003276/",
    "https://www.youtube.com/watch?v=rQRQVw4Lx7c",
    "https://news.yahoo.co.jp/pickup/6484195",
    "https://www.marines.co.jp/",
]

const OUTPUT_DIR = path.join(__dirname, "../output")

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GPT4_PROMPT_COST = 0.01 / 1000 // per token
const GPT4_COMPLETION_COST = 0.03 / 1000 // per token

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

async function imageToJpgBase64(imagePath: string) {
  const buffer = fs.readFileSync(imagePath)
  /*
  const s = sharp(img)
  // convert to jpg by sharp
  // get dimensions
  const { width, height } = await s.metadata()
  console.log(`Image dimensions: ${width}x${height}`)
  const buffer = await sharp(img).jpeg().toBuffer()
  */
  return buffer.toString("base64")
}

async function describeImage(imagePath: string) {
  const imageBase64 = await imageToJpgBase64(imagePath)
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "ウェブサイトの画像です。どのようなサイトか説明してください" },
          {
            type: "image_url",
            image_url: {
              "url": `data:image/png;base64,${imageBase64}`
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const { usage, choices } = response
  if (!usage) {
    throw new Error("No usage")
  }
  const promptCost = usage.prompt_tokens * GPT4_PROMPT_COST
  const completionCost = usage.completion_tokens * GPT4_COMPLETION_COST
  const totalCost = promptCost + completionCost
  console.log(usage)
  console.log(`Total cost: $${totalCost}`)
  console.log(choices[0])
  return choices[0].message.content
}

async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}


async function main() {

  for (const url of urls) {
    try {
        console.log(`Processing ${url}`)
        const safeUrl = url.replace(/https?:\/\//, "").replace(/\//g, "_").replace(/\?/g, "_")
        const imagePath = path.join(OUTPUT_DIR, `${safeUrl}.png`)
        const descPath = path.join(OUTPUT_DIR, `${safeUrl}.txt`)
        const browser = await puppeteer
            .launch({
                defaultViewport: {
                    width: 1280,
                    height: 2000,
                },
                headless: "new",
            })
        const page = await browser.newPage();
        await page.goto(url);
        await delay(1000)
        await page.screenshot({ path: imagePath });
        await browser.close();

        const text = await describeImage(imagePath)
        fs.writeFileSync(descPath, text || "No description")
    } catch (error) {
      console.error(error)
    }
  }
  process.exit(0)
}


main()