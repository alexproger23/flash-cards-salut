# Salute voice integration

Frontend uses `@salutejs/client`, but voice input is now active only on the study screen.
The debug native panel is hidden; study start buttons request listening programmatically.

## Local setup

Create `frontend/.env`:

```dotenv
VITE_SALUTE_TOKEN=token_from_SmartApp_Studio_emulator
VITE_SALUTE_SMARTAPP=CanvasApp_name
```

After changing `.env`, restart `npm run dev`.

## Supported actions from SmartApp Code

```json
{
  "action": {
    "action_id": "check_answer",
    "parameters": {
      "answer": "spoken answer"
    }
  }
}
```

`check_answer` compares `answer` with the current card back using a simple normalized exact match.
The prefixes `ответ`, `мой ответ`, `я думаю`, and `думаю что` are stripped before comparison.

```json
{
  "action": {
    "action_id": "dont_know_card",
    "parameters": {}
  }
}
```

`dont_know_card` reveals the current answer.

All other assistant actions are ignored unless the current frontend screen is `study`.

## Voice feedback

For spoken feedback the frontend sends:

```json
{
  "action": {
    "action_id": "voice_feedback",
    "parameters": {
      "text": "Правильно!",
      "reason": "answer_correct"
    }
  }
}
```

SmartApp Code handles `voice_feedback` in `src/sc/frontendEvents.sc`.
