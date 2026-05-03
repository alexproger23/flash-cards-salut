# Salute voice integration

Frontend uses `@salutejs/client` and accepts commands from a SmartApp Code scenario.
Speech recognition stays in SmartApp Studio; this app only receives normalized actions and updates the flashcards UI.

## Local setup

Create `frontend/.env`:

```dotenv
VITE_SALUTE_TOKEN=token_from_SmartApp_Studio_emulator
VITE_SALUTE_SMARTAPP=CanvasApp_name
```

`REACT_APP_TOKEN` and `REACT_APP_SMARTAPP` are also supported, so the old `salut-smart-app` env can be reused.
After changing `.env`, restart `npm run dev`.

## Commands from SmartApp Code

Recommended payload:

```json
{
  "action": {
    "action_id": "show_answer",
    "parameters": {}
  }
}
```

Supported `action_id` values:

| Action | Parameters | Effect |
| --- | --- | --- |
| `go_home`, `home`, `show_topics`, `all_topics` | - | Open topics list |
| `back`, `go_back` | - | Go back |
| `new_topic`, `open_new_topic_form` | - | Open topic creation form |
| `create_topic` | `title` or `topic_title`, optional `description` | Create a custom topic |
| `open_topic` | `topic_id`, `topic_title`, or `number` | Open a topic; built-in topics start study |
| `start_study`, `start_topic`, `practice_topic` | `topic_id`, `topic_title`, or `number` | Start practice |
| `add_card`, `create_card` | `front` or `question`, `back` or `answer`, optional `topic_id`/`topic_title` | Add a card to a custom topic |
| `delete_card`, `remove_card` | `card_id`, `card_number`, or `front` | Delete a card on the custom topic screen |
| `show_answer`, `reveal_answer`, `read_answer` | - | Flip current study card and ask scenario to speak the answer |
| `flip_card`, `turn_card` | - | Toggle current study card side |
| `repeat_question`, `read_question` | - | Ask scenario to speak the current question |
| `know_card`, `mark_known`, `known`, `i_know` | - | Mark current card as known |
| `dont_know_card`, `do_not_know_card`, `mark_unknown`, `unknown`, `i_dont_know` | - | Mark current card as unknown |
| `study_again`, `restart_study` | - | Restart current practice/results topic |
| `set_topic_title`, `set_title` | `title` or `value` | Fill title on topic form |
| `set_topic_description`, `set_description` | `description` or `value` | Fill description on topic form |
| `set_topic_emoji`, `set_emoji` | `emoji`, `icon`, or `value` | Fill emoji on topic form |
| `save_topic` | optional topic fields | Save current topic form |

The frontend also exposes `item_selector` in `getState()` for topics/cards:

```json
{
  "item_selector": {
    "items": [
      { "number": 1, "id": "custom_...", "title": "English verbs" }
    ],
    "ignored_words": ["открой", "запусти", "тема"]
  }
}
```

Use it in the scenario to map phrases like "открой первую тему" or "удали вторую карточку" to ids/numbers.

## Events sent back to scenario

For voice feedback the frontend calls:

```json
{
  "action": {
    "action_id": "voice_feedback",
    "parameters": {
      "value": "Ответ: ...",
      "text": "Ответ: ...",
      "reason": "read_answer"
    }
  }
}
```

Handle `voice_feedback` in SmartApp Code if the assistant should say these phrases aloud.
