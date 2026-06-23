import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)  # fine for local dev; lock this down to your real domain before deploying

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
TRAIN_KEY = os.environ.get("TRAIN_KEY", "")

EXAMPLES_FILE = Path(__file__).parent / "examples.json"

VIBE_INSTRUCTIONS = {
    "flirtier": "Lean flirty and playful, while still sounding like me.",
}


def load_examples():
    if not EXAMPLES_FILE.exists():
        return []
    try:
        return json.loads(EXAMPLES_FILE.read_text())
    except Exception:
        return []


def save_examples(examples):
    EXAMPLES_FILE.write_text(json.dumps(examples, indent=2))


def check_train_key():
    # if TRAIN_KEY isn't set at all, training routes stay locked by default
    key = request.headers.get("X-Train-Key", "")
    return bool(TRAIN_KEY) and key == TRAIN_KEY


def build_system_prompt(examples):
    base = (
        "You help someone draft a text message reply that genuinely sounds like them — "
        "not like a generic AI assistant. "
    )
    if examples:
        base += (
            "Below are real exchanges: things people have said to them, sometimes with extra "
            "context about the situation, and how they actually replied (some replies have no "
            "preceding message — those are just standalone examples of their voice). Study not "
            "just their tone, punctuation, capitalization, length, slang, and emoji use, but how "
            "they tend to respond to different kinds of messages and situations. Don't make "
            'replies sound more polished, formal, or "AI-like" than these examples.\n\n'
            "Their real exchanges:\n"
        )
        for ex in examples:
            if ex.get("prompt"):
                base += f"Her: {ex['prompt']}\n"
            if ex.get("context"):
                base += f"(Context: {ex['context']})\n"
            base += f"You: {ex['reply']}\n\n"
    else:
        base += (
            "No writing samples were provided, so default to a natural, casual, low-key "
            "texting voice — short, easy, not try-hard.\n"
        )
    base += (
        "\nWrite reply text only — no stage directions, no quotation marks around it, no "
        "explanation. When asked for multiple options, make them genuinely different from each "
        "other in angle, not just reworded, while each still sounding like the same person."
    )
    return base


def build_user_prompt(her_message, context):
    p = f'Message I need to reply to:\n"{her_message}"\n\n'
    if context:
        p += f"Context: {context}\n\n"
    p += VIBE_INSTRUCTIONS["flirtier"] + "\n\n"
    p += (
        "Give me 3 distinct reply options.\n"
        'Respond with ONLY this JSON, no commentary, no markdown fences:\n'
        '{"replies": ["option 1", "option 2", "option 3"]}'
    )
    return p


@app.route("/api/examples", methods=["GET"])
def get_examples():
    if not check_train_key():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"examples": load_examples()})


@app.route("/api/examples", methods=["POST"])
def add_example():
    if not check_train_key():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    reply = (data.get("reply") or "").strip()
    if not reply:
        return jsonify({"error": "reply is required"}), 400
    examples = load_examples()
    examples.append({
        "prompt": (data.get("prompt") or "").strip() or None,
        "context": (data.get("context") or "").strip() or None,
        "reply": reply,
    })
    save_examples(examples)
    return jsonify({"examples": examples})


@app.route("/api/examples/<int:index>", methods=["DELETE"])
def delete_example(index):
    if not check_train_key():
        return jsonify({"error": "Unauthorized"}), 401
    examples = load_examples()
    if 0 <= index < len(examples):
        examples.pop(index)
        save_examples(examples)
    return jsonify({"examples": examples})


@app.route("/api/voice-status", methods=["GET"])
def voice_status():
    # public-safe: count only, never the actual text — anyone can hit this
    return jsonify({"count": len(load_examples())})


@app.route("/api/generate-reply", methods=["POST"])
def generate_reply():
    data = request.get_json(silent=True) or {}
    her_message = (data.get("herMessage") or "").strip()
    context = (data.get("context") or "").strip()

    if not her_message:
        return jsonify({"error": "herMessage is required"}), 400

    examples = load_examples()
    system = build_system_prompt(examples)
    user_prompt = build_user_prompt(her_message, context)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=1000,
        )
        text = response.choices[0].message.content or ""
        return jsonify({"content": [{"type": "text", "text": text}]})
    except Exception as e:
        print("Groq API error:", e)
        return jsonify({"error": "Something went wrong talking to Groq."}), 500


if __name__ == "__main__":
    app.run(port=5001, debug=True)