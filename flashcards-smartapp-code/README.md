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

## Голосовые команды

### Запуск и помощь

| Что сказать | Что отправится во frontend |
| --- | --- |
| `запусти flashcards` | `go_home` |
| `открой flashcards` | `go_home` |
| `вруби flashcards` | `go_home` |
| `помощь` | Только голосовой ответ сценария |
| `что ты умеешь` | Только голосовой ответ сценария |
| `какие команды` | Только голосовой ответ сценария |
| `что можно сказать` | Только голосовой ответ сценария |

### Навигация

| Что сказать | Что отправится во frontend |
| --- | --- |
| `домой` | `go_home` |
| `на главную` | `go_home` |
| `покажи темы` | `go_home` |
| `открой темы` | `go_home` |
| `все темы` | `go_home` |
| `список тем` | `go_home` |
| `назад` | `back` |
| `вернись назад` | `back` |
| `новая тема` | `new_topic` |
| `создать тему` | `new_topic` |
| `добавить тему` | `new_topic` |
| `создай новую тему` | `new_topic` |

### Выбор и запуск темы

| Что сказать | Что отправится во frontend |
| --- | --- |
| `начни тему номер 1` | `start_study` с `number: 1` |
| `запусти тренировку номер 2` | `start_study` с `number: 2` |
| `открой карточки номер 3` | `start_study` с `number: 3` |
| `начни тему English Vocabulary` | `start_study` с `topic_title` |
| `запусти тренировку английские глаголы` | `start_study` с `topic_title` |
| `открой тему номер 1` | `open_topic` с `number: 1` |
| `покажи тему номер 2` | `open_topic` с `number: 2` |
| `выбери тему номер 3` | `open_topic` с `number: 3` |
| `открой тему English Vocabulary` | `open_topic` с `topic_title` |
| `покажи тему английские глаголы` | `open_topic` с `topic_title` |

### Тренировка

| Что сказать | Что отправится во frontend |
| --- | --- |
| `покажи ответ` | `show_answer` |
| `открой ответ` | `show_answer` |
| `скажи ответ` | `show_answer` |
| `прочитай ответ` | `show_answer` |
| `переверни карточку` | `flip_card` |
| `поверни карточку` | `flip_card` |
| `открой карточку` | `flip_card` |
| `повтори вопрос` | `repeat_question` |
| `прочитай вопрос` | `repeat_question` |
| `скажи текущий вопрос` | `repeat_question` |
| `повтори карточку` | `repeat_question` |
| `знаю` | `know_card` |
| `я знаю` | `know_card` |
| `знал` | `know_card` |
| `помню` | `know_card` |
| `правильно` | `know_card` |
| `верно` | `know_card` |
| `легко` | `know_card` |
| `не знаю` | `dont_know_card` |
| `я не знаю` | `dont_know_card` |
| `не знал` | `dont_know_card` |
| `не помню` | `dont_know_card` |
| `неправильно` | `dont_know_card` |
| `ошибка` | `dont_know_card` |
| `сложно` | `dont_know_card` |
| `повторить тренировку` | `study_again` |
| `начать заново` | `study_again` |
| `пройти еще раз` | `study_again` |
| `сначала` | `study_again` |

### Создание и редактирование тем

| Что сказать | Что отправится во frontend |
| --- | --- |
| `создай тему английские глаголы` | `create_topic` с `title` |
| `добавь тему биология` | `create_topic` с `title` |
| `сделай новую тему история` | `create_topic` с `title` |
| `название английские глаголы` | `set_topic_title` с `title` |
| `назови тему английские глаголы` | `set_topic_title` с `title` |
| `установи название английские глаголы` | `set_topic_title` с `title` |
| `описание подготовка к экзамену` | `set_topic_description` с `description` |
| `установи описание подготовка к экзамену` | `set_topic_description` с `description` |
| `добавь описание подготовка к экзамену` | `set_topic_description` с `description` |
| `сохрани тему` | `save_topic` |
| `готово` | `save_topic` |

### Карточки

| Что сказать | Что отправится во frontend |
| --- | --- |
| `новая карточка` | `new_card` |
| `добавить карточку` | `new_card` |
| `создай карточку` | `new_card` |
| `добавь карточку вопрос go ответ went gone` | `add_card` с `front: go`, `back: went gone` |
| `создай карточку вопрос run ответ ran run` | `add_card` с `front: run`, `back: ran run` |
| `запиши карточку вопрос osmosis ответ movement of water` | `add_card` с `front`, `back` |
| `удали карточку номер 1` | `delete_card` с `number: 1` |
| `удалить карточку номер 2` | `delete_card` с `number: 2` |
| `удали карточку go` | `delete_card` с `front: go` |

## События от frontend

Frontend может отправить обратно:

| Event | Зачем |
| --- | --- |
| `voice_feedback` | Сценарий озвучивает `text` или `value`, например текущий ответ карточки |
| `done` | Резервное событие, отвечает `value` или `Готово` |

Обработка находится в `src/sc/frontendEvents.sc`.
