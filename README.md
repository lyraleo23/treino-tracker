# Treino Tracker

PWA para gerenciar treinos de academia no iPhone — sem conta de desenvolvedor Apple,
sem backend e sem cadastro. Todos os dados ficam no próprio aparelho (IndexedDB).

## O que faz

- **Treinos A, B, C...** com exercícios ordenados, número de séries e alvo por
  exercício: repetições fixas (12), faixa (8–12) ou tempo (60s).
- **Catálogo global de exercícios**: o exercício existe uma vez só e é referenciado
  pelos treinos. Por isso **o peso usado é lembrado em qualquer treino ou sessão** —
  registrou 40 kg no supino do Treino A, ele aparece pré-preenchido no Treino B.
- **Sessões**: executa o treino registrando peso e repetições/tempo reais, com
  cronômetro regressivo para os exercícios de tempo.
- **Histórico e evolução**: lista de sessões e, por exercício, gráfico de peso
  máximo / volume / repetições (ou tempo) ao longo das sessões.
- **Backup**: exportar e importar tudo em JSON.

## Rodando localmente

```bash
npm install
npm run dev
```

Os ícones do PWA são gerados por script (não precisa rodar de novo a menos que
mude o desenho):

```bash
node scripts/generate-icons.mjs
```

## Deploy no GitHub Pages

1. Crie o repositório no GitHub com o nome **`treino-tracker`** e envie o código.
   O nome importa: ele é o `base` do Vite em `vite.config.ts`. Usando outro nome,
   ajuste a constante `REPO` nesse arquivo.
2. Em **Settings → Pages**, defina **Source: GitHub Actions**.
3. Cada `push` na branch `main` publica o app em
   `https://<seu-usuario>.github.io/treino-tracker/`.

## Instalando no iPhone

1. Abra a URL do Pages no **Safari** (precisa ser o Safari — o Chrome no iOS não
   instala PWA).
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. Abra pelo ícone: o app roda em tela cheia, funciona offline e não expira.

## Cuidados com os dados

Os dados vivem no IndexedDB do Safari. Um PWA instalado na tela de início não sofre
a limpeza automática de sites inativos, mas **"Limpar histórico e dados dos sites"
apaga tudo**. Use *Ajustes → Exportar backup* de vez em quando, principalmente antes
de trocar de aparelho.

## Estrutura

```
src/
  db/          Dexie: schema, consultas, mutações, backup e seed do catálogo
  pages/       uma tela por rota (treinos, sessão, histórico, exercícios, ajustes)
  components/  peças reutilizáveis (modais, timer, shell, ícones)
  hooks/       cronômetro por timestamp e wake lock
  lib/         formatação pt-BR, ids e feedback sonoro
```

## Stack

React 19 · TypeScript · Vite 6 · Dexie (IndexedDB) · React Router (HashRouter) ·
Recharts · vite-plugin-pwa
