API 对接文档
接口兼容 OpenAI 图片接口，使用用户自己的 API Key 作为授权入口，返回结果默认包含 b64_json。

https://gpt222.solov.cc
基础信息
Base URL
https://gpt222.solov.cc
鉴权
Authorization: Bearer <用户 API Key>
模型
gpt-image-2
响应格式
b64_json
用户在页面里输入的 API Key，也可以直接作为 API 调用的 Bearer Token。图片记录按 API Key 独立保存，保留 10 天。

接口列表
POST
/v1/images/generations
OpenAI 兼容基础生图，同步等待完成。

POST
/v1/images/edits
OpenAI 兼容图片编辑，multipart 上传图片。

POST
/v1/images/jobs
提交到本站任务队列，立即返回 job id。

GET
/v1/images/jobs/{job_id}
查询任务详情，成功后返回 images[].b64_json。

GET
/v1/images/history
分页查询当前 API Key 的图片记录。

GET
/v1/usage
查询钱包余额。

基础生图：OpenAI 兼容
适合现有 OpenAI SDK 或 OpenAI 兼容客户端直接接入。

curl https://gpt222.solov.cc/v1/images/generations \
  -H "Authorization: Bearer <用户 API Key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "中国古代风格的庭院场景，细腻写实",
    "n": 1,
    "size": "1024x1024",
    "quality": "auto",
    "response_format": "b64_json"
  }'
同步接口会等待任务完成后返回 OpenAI 风格响应：
{ "data": [{ "b64_json": "..." }] }
。如果站点前面有 CDN 或反向代理，长图任务可能在等待期间被断开，生产环境更推荐使用下面的任务队列接口。
Python SDK 示例
from openai import OpenAI
import base64

client = OpenAI(
    base_url="https://gpt222.solov.cc/v1",
    api_key="<用户 API Key>",
)

resp = client.images.generate(
    model="gpt-image-2",
    prompt="未来太空站内部，巨大舷窗外是地球和星空",
    n=1,
    size="1024x1024",
    quality="auto",
)

with open("out.png", "wb") as f:
    f.write(base64.b64decode(resp.data[0].b64_json))
图片编辑：单图 / 多图
编辑接口使用 multipart/form-data，单图和多图都重复使用 image 字段；遮罩图可用 mask 字段。

curl https://gpt222.solov.cc/v1/images/edits \
  -H "Authorization: Bearer <用户 API Key>" \
  -F "model=gpt-image-2" \
  -F "prompt=把背景改成日落海边，保持主体不变" \
  -F "response_format=b64_json" \
  -F "image=@input-1.png" \
  -F "image=@input-2.png"
异步任务队列
如果不想长时间占用 HTTP 连接，使用本站队列接口。提交后轮询 job 状态，成功后读取 images[].b64_json。

# 1. 提交任务
curl https://gpt222.solov.cc/v1/images/jobs \
  -H "Authorization: Bearer <用户 API Key>" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "generations",
    "model": "gpt-image-2",
    "prompt": "一只穿宇航服的柯基站在月球表面",
    "n": 4,
    "response_format": "b64_json"
  }'

# 2. 查询任务
curl https://gpt222.solov.cc/v1/images/jobs/job_xxx \
  -H "Authorization: Bearer <用户 API Key>"
任务状态
queued
running
succeeded
failed
Python 队列示例
遇到 Server disconnected without sending a response、Cloudflare/Nginx 超时、或图片生成时间较长时，使用这个方式最稳。

import base64
import time
import requests

BASE_URL = "https://gpt222.solov.cc"
API_KEY = "<用户 API Key>"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

submit = requests.post(
    f"{BASE_URL}/v1/images/jobs",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={
        "endpoint": "generations",
        "model": "gpt-image-2",
        "prompt": "未来太空站内部，巨大舷窗外是地球和星空",
        "n": 1,
        "size": "1024x1024",
        "quality": "auto",
        "response_format": "b64_json",
    },
    timeout=30,
)
submit.raise_for_status()
job_id = submit.json()["id"]

while True:
    job = requests.get(
        f"{BASE_URL}/v1/images/jobs/{job_id}",
        headers=HEADERS,
        timeout=30,
    )
    job.raise_for_status()
    payload = job.json()

    if payload["status"] == "succeeded":
        for index, image in enumerate(payload["images"], start=1):
            with open(f"out-{index}.png", "wb") as f:
                f.write(base64.b64decode(image["b64_json"]))
        break

    if payload["status"] == "failed":
        raise RuntimeError(payload.get("error_message") or "image job failed")

    time.sleep(3)
常用参数
prompt
必填，提示词
n
生成数量，建议 1-4
size
如 1024x1024 / 1536x1024 / auto
quality
low / medium / high / auto
endpoint
队列接口可填 generations 或 edits
错误处理
401
invalid api key
API Key 无效或已失效。

402
insufficient credits
余额不足，请充值后重试。

429
rate limit
尝试过多或队列已满。

5xx
upstream error
上游异常，可稍后重试。