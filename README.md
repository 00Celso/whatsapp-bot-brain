# WhatsApp Bot Brain

Este é o "cérebro" do teu bot — recebe eventos do Evolution API (mensagens, entradas de grupo) e decide o que responder, moderar ou anunciar. Corre separado do Evolution, como outro serviço no Render.

## O que já vem pronto

- `!ping` — responde "Pong!" (para testar que está tudo ligado)
- `!ajuda` — lista os comandos disponíveis
- `!banir @pessoa` — remove um membro do grupo (o bot precisa de ser admin)
- Boas-vindas automáticas quando alguém entra num grupo
- `/broadcast` — endpoint para enviares anúncios a vários grupos de uma vez

## Como adicionar um comando novo

Abre `index.js`, vai ao objeto `commands` e acrescenta uma função nova, ex:

```js
async horario(ctx) {
  await sendText(ctx.remoteJid, 'Funcionamos das 8h às 18h, segunda a sábado.');
},
```

Fica logo disponível como `!horario`.

## Deploy no Render

1. Cria um repositório novo no GitHub (ex: `whatsapp-bot-brain`) e sobe esta pasta para lá.
2. No Render, cria um **New Web Service**, aponta para esse repositório.
3. Environment: **Node**. Build Command: `npm install`. Start Command: `npm start`.
4. Em Environment Variables, copia o conteúdo do `.env.example` e preenche com os teus valores reais.
5. Depois do deploy, vais ter uma URL tipo `https://whatsapp-bot-brain-xxxx.onrender.com`.

## Ligar ao Evolution

1. Abre o Manager do teu Evolution (`/manager`).
2. Vai às definições da tua instância > **Webhook**.
3. Ativa e cola a URL: `https://whatsapp-bot-brain-xxxx.onrender.com/webhook`
4. Marca os eventos: `MESSAGES_UPSERT` e `GROUP_PARTICIPANTS_UPDATE` (podes marcar mais conforme fores adicionando funcionalidades).
5. Guarda.

## Testar

Manda `!ping` num grupo onde o bot esteja — deve responder "Pong! 🏓" em segundos.

## Enviar um anúncio a vários grupos

```bash
curl -X POST https://whatsapp-bot-brain-xxxx.onrender.com/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "a_tua_BOT_SECRET",
    "groups": ["120363xxxxxxxxx@g.us", "120363yyyyyyyyy@g.us"],
    "message": "📢 Aviso importante para todos!"
  }'
```

Para saberes o JID de um grupo, podes chamar o endpoint `/group/fetchAllGroups/{instancia}` do próprio Evolution API (com o parâmetro `getParticipants=false`), que devolve a lista de grupos com os respetivos IDs.
