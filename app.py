import json
import logging
import os
from pathlib import Path

from dotenv import dotenv_values, load_dotenv
from flask import Flask, jsonify, request
from openai import OpenAI, OpenAIError
from waitress import serve

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)
env_values = dotenv_values(ENV_PATH)

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=str(BASE_DIR / "public"), static_url_path="")

# Prefer a real environment variable, otherwise use the final value parsed
# from .env. This handles an accidental blank duplicate before the real key.
api_key = (os.getenv("OPENAI_API_KEY") or env_values.get("OPENAI_API_KEY") or "").strip()
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
placeholder = api_key.lower() in {"sk-...", "your_actual_openai_api_key_here"} or api_key.lower().startswith("sk-your-")
# A duplicate or unrelated .env line must not disable all AI endpoints.
online_enabled = api_key.startswith("sk-") and len(api_key) > 20 and not placeholder
openai_client = OpenAI(api_key=api_key) if online_enabled else None


def local_tutor_reply(message):
    return (
        "## Free Local Study Tutor\n\n"
        "Here is a clear, step-by-step explanation of your question.\n\n"
        f"**Your question:** {message.strip()}\n\n"
        "**Study approach:**\n"
        "1. Define the main concept in one sentence.\n"
        "2. Break it into three key ideas.\n"
        "3. Connect it to a real business or marketing example.\n"
        "4. Write one example of your own to check understanding.\n\n"
        "Use the example and practice prompt to check your understanding."
    )


@app.after_request
def allow_local_frontend(response):
    origin = request.headers.get("Origin", "")
    if origin in {"http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3001", "http://localhost:3001", "http://127.0.0.1:5000", "http://localhost:5000"}:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def api_error(message, status, error_code):
    return jsonify({"success": False, "error": message, "code": error_code}), status


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "healthy",
            "provider": "OpenAI + Local Python StudySmart Engine" if online_enabled else "Local Python StudySmart Engine",
            "mode": "openai" if online_enabled else "local-fallback",
            "isConfigured": online_enabled,
            "openaiAvailable": False,
            "localTutorAvailable": True,
        }
    )


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = payload.get("message")

    if not isinstance(message, str) or not message.strip():
        return api_error("Message parameter is required and cannot be empty.", 400, "empty_message")

    if len(message) > 4000:
        return api_error("Message exceeds the 4000 character limit.", 400, "message_too_long")

    if not online_enabled or openai_client is None:
        return jsonify({"success": True, "reply": local_tutor_reply(message), "source": "local-fallback"})

    messages = [{"role": "system", "content": "You are StudySmart AI, a concise and helpful academic tutor."}]
    history = payload.get("history", [])
    if isinstance(history, list):
        for turn in history[-8:]:
            if isinstance(turn, dict) and turn.get("role") in {"user", "assistant"} and isinstance(turn.get("content"), str):
                messages.append({"role": turn["role"], "content": turn["content"][:3000]})
    messages.append({"role": "user", "content": message.strip()})
    try:
        completion = openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=800,
        )
        reply = completion.choices[0].message.content if completion.choices else ""
        if reply and reply.strip():
            return jsonify({"success": True, "reply": reply.strip()})
        return api_error("OpenAI returned an empty response. Please try again.", 502, "empty_openai_response")
    except OpenAIError as error:
        logger.warning("OpenAI request failed. status=%s type=%s", getattr(error, "status_code", "unknown"), type(error).__name__)
        if getattr(error, "status_code", None) == 429:
            return jsonify({"success": True, "reply": local_tutor_reply(message), "source": "local-fallback"})
        return api_error("OpenAI could not complete the request. Please try again.", 502, "openai_request_failed")


@app.post("/api/generate-career")
def generate_career():
    """Generate the career-roadmap JSON consumed by the web client."""
    payload = request.get_json(silent=True) or {}
    career_goal = payload.get("careerGoal")

    if not isinstance(career_goal, str) or not career_goal.strip():
        return api_error("Career goal parameter is required.", 400, "empty_career_goal")
    if len(career_goal) > 100:
        return api_error("Career goal exceeds the 100 character limit.", 400, "career_goal_too_long")
    if not online_enabled or openai_client is None:
        return api_error(
            "OpenAI API key is not configured. Add a valid OPENAI_API_KEY to .env and restart the server.",
            503,
            "openai_not_configured",
        )

    goal = career_goal.strip()
    prompt = f"""Create a practical six-month career roadmap for an undergraduate targeting {goal!r}.
Return only valid JSON (no Markdown) containing roleTitle, overview, skillsChecklist,
milestones, recommendedProjects, and interviewQuestions. milestones must be an array
of three objects with phase, goal, and tasks. recommendedProjects must contain name,
description, techStack, and portfolioImpact. interviewQuestions must contain question
and guidance. Make every field useful and specific to the requested role."""
    try:
        completion = openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a career counselor. Return strictly valid JSON without Markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=2800,
        )
        raw_text = (completion.choices[0].message.content if completion.choices else "") or ""
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        roadmap = json.loads(raw_text)
        if not isinstance(roadmap, dict):
            raise ValueError("Career response is not a JSON object")
        return jsonify({"success": True, "careerGoal": goal, "roadmap": roadmap})
    except (OpenAIError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Career planning request failed. type=%s", type(error).__name__)
        return api_error("Career planning could not complete the request. Please try again.", 502, "career_request_failed")


if __name__ == "__main__":
    serve(app, host="127.0.0.1", port=5000)
