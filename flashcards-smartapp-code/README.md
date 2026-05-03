# Flashcards SmartApp Code scenario

Эту папку можно импортировать в SmartApp Studio как проект SmartApp Code.

## Как загрузить

1. Открой SmartApp Studio.
2. Создай или открой SmartApp Code проект.
3. Загрузи содержимое этой папки или архив `flashcards-smartapp-code.zip`.
4. Собери/опубликуй SmartApp Code.
5. Скопируй webhook опубликованного сценария.
6. В CanvasApp выбери сценарий `SmartApp Code API` и вставь webhook.

## Что отправляется во frontend

Сценарий отправляет команды формата:

```json
{
  "type": "smart_app_data",
  "action": {
    "action_id": "show_answer",
    "parameters": {}
  }
}
```

Frontend уже умеет принимать эти `action_id`.

## Что нужно поменять

В `src/entryPoint.sc` замени `flashcards` на реальное имя CanvasApp, если запускаешь голосом:

```text
q!: (запусти | открой | вруби) flashcards
```
