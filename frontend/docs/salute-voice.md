# Salute voice integration

Frontend uses `@salutejs/client` and accepts voice actions on the main app screens: library, study, tests, topic editor, card manager, auth, and results.
The SmartApp Code scenario lives in `flashcards-smartapp-code/`.

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
    "action_id": "start_topic",
    "parameters": {
      "number": 1,
      "topic_id": "english-vocabulary"
    }
  }
}
```

The current screen state is exposed to Salute through `getState()`. Screens publish `item_selector.items`, so the scenario can resolve numeric commands like `тема номер 1`, `карточка номер 2`, and `вариант 3`.

Main action ids:

- navigation: `go_home`, `go_back`, `open_auth`, `open_tests`;
- topics: `new_topic`, `open_topic`, `start_topic`, `edit_topic`, `delete_topic`, `confirm`, `cancel`;
- study: `check_answer`, `reveal_answer`, `dont_know_card`, `mark_known`, `mark_unknown`, `repeat_card`;
- tests: `start_test`, `answer_test_option`, `answer_test_text`, `repeat_test`;
- topic form: `set_topic_title`, `set_topic_description`, `set_topic_icon`, `enable_auto_generate`, `disable_auto_generate`, `set_cards_count`, `save_topic`;
- cards: `add_card`, `delete_card`;
- appearance: `set_theme`, `toggle_theme`.

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
