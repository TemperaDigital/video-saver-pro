# Implantação no ZimaOS (Docker)

A aplicação sobe em três containers atrás de um proxy na porta **3005**, tudo na mesma origem
(sem bloqueio de conteúdo misto no navegador):

```text
http://SEU-IP:3005/          -> interface web
http://SEU-IP:3005/api/dl/*  -> motor de extração (yt-dlp + ffmpeg)
```

## Subir

```bash
mkdir -p cookies
docker compose up -d --build
```

Acesse `http://192.168.1.53:3005` (troque pelo IP real do seu ZimaOS).

## Conteúdo que exige login (Instagram, Facebook, YouTube com restrição)

1. Exporte os cookies do navegador no formato Netscape (`cookies.txt`).
2. Salve em `./cookies/cookies.txt`.
3. Descomente `COOKIES_FILE: /cookies/cookies.txt` no `docker-compose.yml`.
4. `docker compose up -d`.

## Manutenção

- As fontes mudam com frequência; o container do motor tenta atualizar o `yt-dlp` a cada start.
  Para forçar: `docker compose restart extractor`.
- Logs: `docker compose logs -f extractor`.
- Verificação rápida do motor: `curl http://localhost:3005/api/dl/health`.

## Notas

- A imagem `web` é construída com o preset `node-server` do Nitro
  (`NITRO_PRESET=node-server`), gerando `.output/server/index.mjs`.
- O motor não grava nada em disco: o arquivo é transmitido direto ao navegador.
- Para apontar a interface a um motor em outro host, defina `VITE_DOWNLOADER_URL`
  no build da imagem `web` (ex.: `http://192.168.1.53:8080`).
