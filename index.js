require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '20mb' }));

const {
  EVOLUTION_API_URL,
  EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE,
  BOT_SECRET,
  PORT = 3000,
} = process.env;

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
  console.error('Faltam variáveis de ambiente obrigatórias. Confere o .env.example');
}

// Cliente axios já configurado para falar com o Evolution API
const evolution = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: { apikey: EVOLUTION_API_KEY },
});

// ---------- Funções auxiliares para falar com o Evolution ----------

async function sendText(number, text) {
  return evolution.post(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    number,
    text,
  });
}

async function removeParticipant(groupJid, participantJid) {
  return evolution.delete(`/group/removeParticipant/${EVOLUTION_INSTANCE}`, {
    data: { groupJid, participants: [participantJid] },
  });
}

async function deleteMessage(remoteJid, messageKey) {
  return evolution.delete(`/chat/deleteMessageForEveryone/${EVOLUTION_INSTANCE}`, {
    data: { id: messageKey.id, remoteJid, fromMe: messageKey.fromMe, participant: messageKey.participant },
  });
}

// ---------- Comandos disponíveis ----------
// Adiciona novos comandos aqui. O prefixo é "!"
const commands = {
  async ping(ctx) {
    await sendText(ctx.remoteJid, 'Pong! 🏓');
  },
  async ajuda(ctx) {
    const lista = Object.keys(commands).map((c) => `!${c}`).join(', ');
    await sendText(ctx.remoteJid, `Comandos disponíveis: ${lista}`);
  },
  async boasvindas(ctx) {
    await sendText(ctx.remoteJid, 'Este comando é chamado automaticamente quando alguém entra no grupo.');
  },
  // exemplo de comando de moderação — só funciona se o bot for admin do grupo
  async banir(ctx) {
    const alvo = ctx.mentionedJid?.[0];
    if (!alvo) {
      await sendText(ctx.remoteJid, 'Usa: !banir @pessoa (marca a pessoa na mensagem)');
      return;
    }
    await removeParticipant(ctx.remoteJid, alvo);
    await sendText(ctx.remoteJid, 'Membro removido.');
  },
};

// ---------- Webhook principal — o Evolution chama isto ----------

app.post('/webhook', async (req, res) => {
  // Responde já 200 para o Evolution não ficar à espera / repetir o pedido
  res.sendStatus(200);

  try {
    const { event, data } = req.body;

    if (event === 'messages.upsert') {
      await handleMessage(data);
    }

    if (event === 'group-participants.update') {
      await handleParticipantsUpdate(data);
    }
  } catch (err) {
    console.error('Erro a processar webhook:', err?.response?.data || err.message);
  }
});

async function handleMessage(data) {
  // Ignora mensagens enviadas pelo próprio bot
  if (data.key?.fromMe) return;

  const remoteJid = data.key?.remoteJid;
  const texto =
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    '';

  if (!texto) return;

  const ctx = {
    remoteJid,
    messageKey: data.key,
    mentionedJid: data.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
  };

  // Comandos começam com "!"
  if (texto.startsWith('!')) {
    const nomeComando = texto.slice(1).trim().split(/\s+/)[0].toLowerCase();
    const handler = commands[nomeComando];
    if (handler) {
      await handler(ctx);
    }
    return;
  }

  // Aqui podes adicionar respostas automáticas por palavra-chave, ex:
  // if (texto.toLowerCase().includes('horário')) {
  //   await sendText(remoteJid, 'Funcionamos das 8h às 18h.');
  // }
}

async function handleParticipantsUpdate(data) {
  // data.action costuma ser "add" | "remove" | "promote" | "demote"
  if (data.action !== 'add') return;

  const grupo = data.id; // JID do grupo
  const novosMembros = data.participants || [];

  for (const membro of novosMembros) {
    const nome = membro.split('@')[0];
    await sendText(grupo, `Bem-vindo(a) ao grupo, @${nome}! 👋`);
  }
}

// ---------- Endpoint para enviar anúncios/broadcast ----------
// POST /broadcast  { "secret": "...", "groups": ["1203xxxx@g.us"], "message": "texto" }

app.post('/broadcast', async (req, res) => {
  const { secret, groups, message } = req.body;

  if (secret !== BOT_SECRET) {
    return res.status(401).json({ error: 'Chave inválida' });
  }
  if (!Array.isArray(groups) || !message) {
    return res.status(400).json({ error: 'Precisa de "groups" (array) e "message"' });
  }

  const resultados = [];
  for (const grupo of groups) {
    try {
      await sendText(grupo, message);
      resultados.push({ grupo, status: 'enviado' });
    } catch (err) {
      resultados.push({ grupo, status: 'falhou', erro: err?.response?.data || err.message });
    }
  }

  res.json({ resultados });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Bot brain a funcionar' });
});

app.listen(PORT, () => {
  console.log(`Bot brain a correr na porta ${PORT}`);
});
