# Flashcards SmartApp Code scenario

Этот сценарий оставлен только для голосового квиза во время тренировки карточек.
Навигационные команды, создание тем и редактирование карточек из сценария убраны.

## Как загрузить

1. Открой SmartApp Studio.
2. Создай или открой SmartApp Code проект.
3. Загрузи архив `flashcards-smartapp-code.zip`.
4. Собери/опубликуй SmartApp Code.
5. Скопируй webhook опубликованного сценария.
6. В CanvasApp выбери сценарий `SmartApp Code API` и вставь webhook.

## Что отправляется во frontend

Сценарий отправляет во frontend только два действия:

```json
{
  "type": "smart_app_data",
  "action": {
    "action_id": "check_answer",
    "parameters": {
      "answer": "spoken answer"
    }
  }
}
```

```json
{
  "type": "smart_app_data",
  "action": {
    "action_id": "dont_know_card",
    "parameters": {}
  }
}
```

## Голосовые фразы

| Что сказать | Что отправится во frontend |
| --- | --- |
| `ответ Lasting for a very short time` | `check_answer` с `answer` |
| `мой ответ Lasting for a very short time` | `check_answer` с `answer` |
| `думаю Lasting for a very short time` | `check_answer` с `answer` |
| `Lasting for a very short time` | `check_answer` с `answer` |
| `я не знаю` | `dont_know_card` |
| `не знаю` | `dont_know_card` |
| `не помню` | `dont_know_card` |
| `сдаюсь` | `dont_know_card` |

## События от frontend

Frontend отправляет `voice_feedback`, чтобы сценарий озвучивал фразы вроде
`Правильно!`, `Неправильно, попробуйте еще раз.` и `Ответ: ...`.
Обработка находится в `src/sc/frontendEvents.sc`.
