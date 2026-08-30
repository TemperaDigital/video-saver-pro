# Baixador de Vídeos — App Web Self-Hosted (Docker)

Aplicação para colar a URL de um vídeo (Instagram, Facebook, YouTube, TikTok, Pinterest, X, Reddit e outras), listar os formatos/qualidades disponíveis, escolher nome do arquivo e baixar vídeo completo ou somente o áudio.

## Arquitetura

Como o motor de extração precisa de `yt-dlp` (binário) e o runtime de borda da Lovable não executa binários, a aplicação nasce preparada para rodar no seu ZimaOS via Docker, tudo na mesma origem `http://192.168.1.53:3005` (sem bloqueio de conteúdo misto no navegador).

```text
docker compose  (porta 3005)
├── proxy (Caddy)          -> :3005
│    ├── /            -> web
│    └── /api/dl/*    -> extractor
├── web        (interface React/TanStack)
└── extractor  (Node + yt-dlp + ffmpeg)
```

- **extractor** — serviço isolado com `yt-dlp` e `ffmpeg` embutidos na imagem:
  - `POST /api/dl/probe` → recebe a URL, devolve título, thumbnail, duração e a lista de formatos nativos (MP4 1080p/720p/480p/360p, áudio m4a/webm) com tamanho estimado.
  - `GET /api/dl/fetch` → faz stream do arquivo escolhido direto para o navegador, já com o `Content-Disposition` no nome definido pelo usuário. Sem gravar em disco, sem fila, sem banco.
  - Auto-atualização opcional do `yt-dlp` no start do container (as fontes mudam com frequência).
- **web** — a interface. Em preview na Lovable ela funciona com o motor apontado por variável de ambiente; sem o extractor acessível, mostra um aviso claro em vez de quebrar.

## Interface (pt-BR, tema escuro premium)

Página única em `src/routes/index.tsx`:

1. **Campo de URL** com colar rápido (botão "Colar da área de transferência") e validação.
2. **Cartão de prévia** após a análise: thumbnail, título, canal/autor, duração, plataforma detectada.
3. **Abas Vídeo / Áudio**:
   - Vídeo: lista de qualidades nativas (resolução, container, fps, tamanho aprox.), seleção por cartão.
   - Áudio: faixas de áudio nativas (m4a/opus/webm) com bitrate.
4. **Nome do arquivo**: campo editável pré-preenchido com o título já higienizado; a extensão é exibida fixa ao lado.
5. **Botão Baixar** com barra de progresso real (leitura do stream) e estados de carregando/erro/vazio via Skeletons.
6. **Histórico da sessão** guardado só no navegador (localStorage) — pronto para migrar ao seu Supabase depois.

Sem login, sem banco de dados nesta etapa. Sem `alert()`/`confirm()`: apenas toasts (sonner) e diálogos do shadcn.

## Detalhes técnicos

- Lógica de negócio isolada em `src/lib/` (parse de URL, detecção de plataforma, higienização de nome de arquivo, formatação de tamanho/duração) — os `.tsx` só renderizam.
- Validação com Zod nas bordas do extractor (URL permitida por protocolo http/https, sem endereços internos — proteção anti-SSRF).
- Cliente do motor em `src/lib/downloader-client.ts` com base URL configurável (`VITE_DOWNLOADER_URL`, padrão `/api/dl`), mantendo o motor plugável.
- Arquivos novos de infraestrutura: `docker/Dockerfile.web`, `docker/Dockerfile.extractor`, `docker/Caddyfile`, `docker-compose.yml`, `extractor/server.js`, e um `README-docker.md` com os comandos de subida no ZimaOS.
- Formatos apenas nativos (sem transcodificação); a única exceção é a remuxagem leve que o próprio `yt-dlp` faz quando vídeo e áudio vêm separados.

## Observações honestas

- A porta que você citou (`192.168.153:3005`) não é um IP válido; assumo `192.168.1.53:3005` e deixo isso configurável no compose.
- Instagram e Facebook frequentemente exigem cookies de sessão para conteúdo restrito; o extractor aceitará um arquivo `cookies.txt` montado como volume, opcional.
- O conector TikTok da Lovable não resolve URLs públicas (só lista vídeos da sua própria conta), então o TikTok será tratado pelo mesmo motor `yt-dlp`.
- No preview da Lovable a interface aparece completa, mas os downloads só funcionam quando o container estiver rodando na sua rede.
