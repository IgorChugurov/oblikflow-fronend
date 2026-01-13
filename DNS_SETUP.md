# Настройка DNS для oblikflow.com

## DNS записи для Namecheap

Перейдите в панель управления доменом `oblikflow.com` в Namecheap:
1. Откройте вкладку **"Advanced DNS"**
2. В разделе **"Host Records"** нажмите **"+ ADD NEW RECORD"**

### Необходимые DNS записи:

#### 1. A-запись для корневого домена

- **Type:** `A Record`
- **Host:** `@` (или оставьте пустым)
- **Value:** `216.198.79.1`
- **TTL:** `Automatic` (или `30 min`)

#### 2. CNAME для admin.oblikflow.com

- **Type:** `CNAME Record`
- **Host:** `admin`
- **Value:** `cname.vercel-dns.com`
- **TTL:** `Automatic`

#### 3. CNAME для workspace.oblikflow.com

- **Type:** `CNAME Record`
- **Host:** `workspace`
- **Value:** `cname.vercel-dns.com`
- **TTL:** `Automatic`

#### 4. CNAME для platform.oblikflow.com

- **Type:** `CNAME Record`
- **Host:** `platform`
- **Value:** `cname.vercel-dns.com`
- **TTL:** `Automatic`

## Итоговая таблица Host Records

После настройки в разделе "Host Records" должны быть следующие записи:

```
Type              Host      Value                    TTL
A Record          @         216.198.79.1            Automatic
CNAME Record      admin     cname.vercel-dns.com    Automatic
CNAME Record      workspace cname.vercel-dns.com    Automatic
CNAME Record      platform  cname.vercel-dns.com    Automatic
```

## Важно

1. **Удалите существующие записи**, которые могут конфликтовать:
   - URL Redirect Record для `@` → `http://www.oblikflow.com/` (если есть)
   - CNAME для `www` → `parkingpage.namecheap.com.` (если не используете www)

2. **После добавления записей:**
   - Сохраните изменения
   - Подождите 5-30 минут для распространения DNS
   - Вернитесь в Vercel и нажмите "Refresh" на странице Domains
   - Статус должен измениться на "Valid Configuration"

3. **Проверка работы:**
   - `oblikflow.com` → проект site
   - `admin.oblikflow.com` → проект admin
   - `workspace.oblikflow.com` → проект workspace
   - `platform.oblikflow.com` → проект platform

## Настройка доменов в Vercel

После настройки DNS, добавьте домены в соответствующие проекты Vercel:

1. **Проект "site"** → Domain: `oblikflow.com`
2. **Проект "admin"** → Domain: `admin.oblikflow.com`
3. **Проект "workspace"** → Domain: `workspace.oblikflow.com`
4. **Проект "platform"** → Domain: `platform.oblikflow.com`

Все домены должны иметь статус "Valid Configuration" после правильной настройки DNS.
