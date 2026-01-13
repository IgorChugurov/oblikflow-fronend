# Авторизация через Cookies между поддоменами

## Как это работает

### Production (реальный домен)

В production cookies **могут** передаваться между поддоменами при правильной настройке:

#### 1. Установка cookie с domain

```javascript
// Правильно: с точкой в начале
document.cookie = "auth_token=xxx; domain=.yourdomain.com; path=/; SameSite=None; Secure;"

// Это делает cookie доступным на:
// - yourdomain.com
// - app.yourdomain.com  
// - workspace.yourdomain.com
// - любым другим поддоменам
```

#### 2. Ключевые параметры

- **`domain=.yourdomain.com`** (с точкой) - делает cookie доступным на всех поддоменах
- **`SameSite=None`** - разрешает отправку cookie при cross-site запросах (между поддоменами)
- **`Secure`** - требует HTTPS (обязательно для SameSite=None)
- **`path=/`** - cookie доступен на всех путях

#### 3. Пример работы

```
1. Пользователь авторизуется на yourdomain.com
   → Cookie устанавливается: auth_token=xxx; domain=.yourdomain.com

2. Пользователь переходит на app.yourdomain.com
   → Браузер автоматически отправляет cookie auth_token
   → Приложение может прочитать токен и проверить авторизацию

3. Пользователь переходит на workspace.yourdomain.com
   → Браузер снова автоматически отправляет тот же cookie
   → Все три приложения видят один и тот же токен
```

### Development (localhost)

**Проблема:** Cookies с `domain` **не работают** для localhost поддоменов.

Это ограничение браузера - `localhost` и его поддомены (`app.localhost`) считаются разными origins, и cookies с domain не могут их объединить.

#### Решения для dev режима

**Вариант 1: localStorage (текущая реализация)**

```javascript
// В dev режиме используем localStorage
localStorage.setItem('auth_token', token);

// Проблема: localStorage не делится между поддоменами
// Решение: при переходе между поддоменами нужно передавать токен
```

**Вариант 2: Один домен с разными путями**

Вместо поддоменов использовать один домен:
- `localhost:3000/public` - витрина
- `localhost:3000/app` - админка
- `localhost:3000/workspace` - рабочее пространство

**Вариант 3: Тестовый домен**

Использовать реальный тестовый домен:
- `local.yourdomain.com` - витрина
- `app.local.yourdomain.com` - админка
- `workspace.local.yourdomain.com` - рабочее пространство

Тогда cookies с domain будут работать как в production.

**Вариант 4: Прокси-сервер**

Настроить прокси, который направляет запросы на разные приложения:
```
localhost:3000 → public
localhost:3000/app → app
localhost:3000/workspace → workspace
```

## Текущая реализация

### Production

1. **Установка токена:**
   ```javascript
   setAuthCookies(session)
   // Устанавливает cookie с domain=.yourdomain.com
   // + сохраняет в localStorage как backup
   ```

2. **Чтение токена:**
   ```javascript
   getAuthToken()
   // Сначала проверяет cookie
   // Если нет - проверяет localStorage (fallback)
   ```

3. **Работает автоматически** между всеми поддоменами

### Development

1. **Установка токена:**
   ```javascript
   setAuthCookies(session)
   // Устанавливает cookie БЕЗ domain (только для текущего поддомена)
   // + сохраняет в localStorage
   ```

2. **Чтение токена:**
   ```javascript
   getAuthToken()
   // Сначала проверяет cookie (может быть пусто)
   // Затем проверяет localStorage
   ```

3. **Ограничение:** localStorage не делится между поддоменами в dev

## Рекомендации

### Для Production

✅ Используйте cookies с domain - это стандартный и безопасный способ  
✅ Убедитесь, что `NEXT_PUBLIC_COOKIE_DOMAIN=.yourdomain.com` (с точкой)  
✅ Используйте HTTPS (Vercel предоставляет автоматически)  
✅ Cookies автоматически получают флаги `SameSite=None; Secure` в production

### Для Development

⚠️ Cookies с domain не работают для localhost поддоменов  
✅ Используйте localStorage как fallback (уже реализовано)  
✅ Для полноценного тестирования используйте тестовый домен или один домен с разными путями

## Проверка работы

### Production

```javascript
// На любом поддомене после авторизации:
document.cookie
// Должен содержать: auth_token=xxx

// Проверка на другом поддомене:
// Откройте app.yourdomain.com → консоль → document.cookie
// Должен быть тот же auth_token
```

### Development

```javascript
// Проверка localStorage:
localStorage.getItem('auth_token')
// Должен содержать токен

// Проверка cookie (может быть пусто):
document.cookie
// Может не содержать токен из-за ограничений localhost
```

## Безопасность

### Production

- ✅ Cookies с `Secure` передаются только по HTTPS
- ✅ `SameSite=None` безопасен при использовании с `Secure`
- ✅ HttpOnly флаг можно добавить для дополнительной защиты (но тогда нужен серверный код для чтения)

### Development

- ⚠️ localStorage доступен для JavaScript (риск XSS)
- ✅ В production основной механизм - cookies
- ✅ localStorage используется только как fallback

## Альтернативные подходы

Если cookies не подходят, можно рассмотреть:

1. **JWT в URL параметре** (только для dev, небезопасно для production)
2. **Session Storage** (не работает между поддоменами)
3. **IndexedDB** (сложнее в использовании)
4. **Единый домен с разными путями** (проще, но менее гибко)

Текущая реализация (cookies + localStorage fallback) - оптимальный баланс между удобством и безопасностью.
