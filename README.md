# Treino Tracker

PWA para gerenciar treinos de academia no iPhone — sem conta de desenvolvedor Apple,
sem backend e sem cadastro. Todos os dados ficam no próprio aparelho (IndexedDB).

## O que faz

- **Treinos A, B, C...** com exercícios ordenados.
- **Blocos de séries** dentro de cada exercício — aquecimento, feeder, working, top,
  back-off, drop e falha. Cada bloco tem o próprio número de séries, alvo
  (repetições fixas, faixa 8–10 ou tempo) e intervalo entre séries. O modelo
  *Feeder + Working* monta a estrutura de uma vez: 2×5–6 · 2×5–6 · 2×8–10 · 2×8–10.
- **Catálogo global de exercícios**: o exercício existe uma vez só e é referenciado
  pelos treinos. Por isso **o peso usado é lembrado em qualquer treino ou sessão** —
  registrou 40 kg no supino do Treino A, ele aparece pré-preenchido no Treino B.
- **Sessões**: registra peso, repetições/tempo e observação em cada série, com
  cronômetro regressivo nos blocos de tempo.
- **Sugestão de progressão**: quando todas as séries dos blocos de *working* fecham o
  topo da faixa, a sessão seguinte oferece subir **2,5 kg ou 5 kg**. O aumento vale
  para o exercício inteiro — feeders e aquecimento sobem junto, cada bloco a partir do
  próprio peso anterior, mantendo a proporção entre eles.
- **Histórico e evolução**: lista de sessões, detalhe agrupado por bloco com as notas
  do treino (sensação geral, pontos fortes, pontos a melhorar) e, por exercício,
  gráfico de peso máximo / volume / repetições ao longo das sessões.
- **Backup**: exportar e importar tudo em JSON (arquivos da v1 são convertidos na
  importação).

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
2. O workflow habilita o Pages sozinho na primeira execução (`enablement: true`).
   Se falhar com *"Get Pages site failed"*, habilite à mão em
   **Settings → Pages → Source: GitHub Actions** e rode o workflow de novo.
   Em conta gratuita isso só funciona com o repositório **público**.
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
  db/          Dexie: schema e migrações, consultas, mutações, backup e seed
  pages/       uma tela por rota (treinos, blocos do exercício, sessão,
               histórico, catálogo, ajustes)
  components/  peças reutilizáveis (modais, timer, shell, ícones)
  hooks/       cronômetro por timestamp e wake lock
  lib/         formatação pt-BR, ids e feedback sonoro
```

O modelo de dados vai de `Workout → WorkoutItem → SetBlock → SetLog`. O `SetLog`
guarda `exerciseId` (peso lembrado entre treinos) **e** `blockId` (peso lembrado por
bloco, para o feeder não herdar a carga do working).

## Stack

React 19 · TypeScript · Vite 6 · Dexie (IndexedDB) · React Router (HashRouter) ·
Recharts · vite-plugin-pwa
