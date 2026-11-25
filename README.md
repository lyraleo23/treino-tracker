# Treino Tracker

PWA para gerenciar treinos de academia no iPhone — sem conta de desenvolvedor Apple,
sem backend e sem cadastro. Todos os dados ficam no próprio aparelho (IndexedDB).

## O que faz

- **Treinos A, B, C...** com exercícios ordenados.
- **Blocos de séries** dentro de cada exercício — aquecimento, feeder, working, top,
  back-off, drop, falha e trecho. Cada bloco tem o próprio número de séries, alvo
  (repetições fixas, faixa 8–10 ou tempo) e intervalo entre séries. O modelo
  *Feeder + Working* monta a estrutura de uma vez: 2×5–6 · 2×5–6 · 2×8–10 · 2×8–10.
- **Exercícios aeróbicos**: esteira, bicicleta, corrida e afins, com prescrição e
  registro de tempo, distância, velocidade, inclinação, resistência, frequência
  cardíaca e calorias — cada exercício escolhe quais métricas usa. A velocidade em
  km/h mostra o ritmo (min/km) ao lado, e o modelo *Escada de trechos* cria os
  intervalos de uma vez: `4 min · 6% · 4,2 km/h`, cada um com seu cronômetro.
- **Catálogo global de exercícios**: o exercício existe uma vez só e é referenciado
  pelos treinos. Por isso **o peso usado é lembrado em qualquer treino ou sessão** —
  registrou 40 kg no supino do Treino A, ele aparece pré-preenchido no Treino B.
- **Formas de fazer**: o mesmo exercício em mais de um equipamento — supino na
  **barra**, nos **halteres**, no **Smith**. Cadastradas em *Exercícios → Editar*,
  cada uma guarda o **próprio histórico de carga**: o peso pré-preenchido, a sugestão
  de aumento e as setas ↑↓ andam por exercício + forma. Cada treino escolhe com qual
  forma faz o exercício (ao adicioná-lo, ou na tela dos blocos dele); sem escolha,
  vale a **padrão**. As séries de antes das formas existirem contam para a padrão.
  A Arena mede só a forma padrão.
- **Exercícios equivalentes**: também no cadastro, os exercícios que podem entrar no
  lugar de outro. A ligação vale nos dois sentidos.
- **Troca só hoje**: a barra está ocupada? O botão **⇄** no cartão do exercício, na
  sessão, abre a troca temporária — outra forma de fazer ou um equivalente, só nesta
  sessão; o treino continua como está. A troca pré-preenche com o próprio histórico,
  mas fica **fora da sugestão de carga**: sem banner de aumento, sem setas ↑↓, e as
  séries dela não contam na progressão de ninguém. As séries já registradas antes de
  trocar continuam como foram feitas, e **Desfazer** volta ao planejado.
- **Sessões**: registra peso, repetições/tempo e observação em cada série, com
  cronômetro regressivo nos blocos de tempo. **Série extra** acrescenta uma linha
  além do planejado, e **Remover série** tira a última delas — registrada ou não.
- **Sugestão de progressão**: quando todas as séries dos blocos de *working* fecham o
  topo da faixa, a sessão seguinte oferece subir **1 kg, 2,5 kg ou 5 kg**. O aumento
  vale para o exercício inteiro — feeders e aquecimento sobem junto, cada bloco a
  partir do próprio peso anterior, mantendo a proporção entre eles. Onde a carga
  sobe, as repetições recomeçam do **mínimo da faixa** (dupla progressão): fechou
  3×8–10 em 10 com 40 kg, volta 42,5 kg × 8. As setas ↑ marcadas na mão não mexem
  nas repetições.
- **Quantas sessões antes de subir**: em *Ajustes → Aumento de carga* dá para exigir
  de 1 a 5 sessões **seguidas** no topo da faixa antes de a sugestão aparecer. Com 2,
  é preciso repetir o desempenho **na mesma carga** em duas sessões; mudar a carga
  recomeça a contagem. Reduzir a carga (série abaixo do mínimo da faixa) e endireitar
  a escada continuam olhando só a última sessão.
- **Subir ou diminuir na mão**: os botões **↑** e **↓** de cada série marcam que a
  carga dela pode subir ou precisa diminuir — um de cada vez. Na próxima vez que o
  exercício aparecer, em qualquer treino, aquela série vem com o peso anterior mais
  (ou menos) o passo do aparelho, destacada em verde ou âmbar. As marcas não entram
  na contagem da sugestão automática, e a automática tem prioridade: enquanto ela
  está na tela, as marcas esperam; aplicada, valem as cargas dela; com *Agora não*,
  as marcas voltam.
- **↓ automático nos blocos de preparo**: uma série de aquecimento, feeder ou
  back-off concluída abaixo do mínimo de repetições do bloco ganha o ↓ sozinha, como
  se a seta tivesse sido tocada — e dá para apagá-lo. Corrigir as repetições para o
  mínimo ou acima apaga o ↓ do mesmo jeito. Working, cluster e top ficam de fora: a
  carga deles continua só com a sugestão automática.
- **Histórico e evolução**: lista de sessões, detalhe agrupado por bloco com as notas
  do treino (sensação geral, pontos fortes, pontos a melhorar) e, por exercício,
  gráfico de peso máximo / volume / repetições ao longo das sessões.
- **Foto e vídeo por exercício**: foto da câmera ou galeria, redimensionada e
  guardada no próprio app (funciona offline), mais um link de vídeo aberto no
  navegador com um toque durante o treino.
- **Treino da vez**: a tela de treinos abre com o próximo da rotação em destaque — o
  seguinte, na ordem do programa, ao último feito (depois do C volta ao A). Treinos
  marcados como **avulso** (o aeróbico adicional, por exemplo) ficam na lista e podem
  ser feitos a qualquer hora, mas a vez passa direto por eles e as sessões deles não
  contam no ciclo.
- **Ciclo do treino**: data-limite ou número de sessões. Na última semana ou nas três
  últimas sessões aparece uma tarja de aviso no topo da tela de treinos; vencido, ela
  fica vermelha e oferece renovar o ciclo — sem nunca impedir de treinar.
- **Arena**: seus pesos contra os de personagens de jogos. Cada exercício pode
  disputar uma **prova** (Supino, Agachamento, Leg press, Prancha...), escolhida em
  *Editar → Prova da Arena*; os do catálogo inicial já vêm ligados. A comparação usa a
  **carga máxima estimada** da melhor série dos **últimos 90 dias** (peso × (1 +
  reps/30), até 12 repetições) — parou de treinar, a marca cai.
  - **No treino**, o cartão do exercício mostra o rival — o personagem logo acima de
    você naquela prova — e a carga para vencê-lo nas repetições do bloco working:
    *Disputando com FULANO · 80 kg · para vencer: 60 kg × 10*. Passou dele, aparece
    *Você venceu FULANO!* e o próximo assume.
  - **Na aba Arena**, a média de todas as provas em comum (mínimo 2, cada uma
    limitada a 150%) diz **qual personagem você é** — o mais forte que você alcança
    —, quem vem a seguir e o ranking completo. Na tela do exercício, a escada da
    prova mostra quando cada personagem foi vencido.
  - **Personagens** ficam em `src/db/catalog/`, um arquivo por jogo, com as cargas
    como vieram da fonte (o GTA VI guarda as libras observadas no jogo e converte
    para kg). Nem todo personagem tem todas as provas. Um personagem pode ter **níveis**
    (a Força 1 a 4 do GTA VI): nome, foto e frase são um só, e cada nível tem as
    próprias cargas e vira um degrau da Arena — "Disputando com Jason Duval · Força
    3", "Você é Lucia Caminos · Força 2". O primeiro elenco é o do **GTA VI** — Jason
    e Lucia, Força 1 a 4 —, com as cargas das capturas do jogo: em cada exercício, a
    carga mais leve do menu é a Força 1 e a mais pesada, a Força 4. A foto é escolhida no
    celular, na página do personagem, e vai no backup junto com as fotos dos
    exercícios. Imagens que puderem ser publicadas também podem vir com o app, em
    `public/personagens/` — o repositório é público.
- **Temas**: em *Ajustes → Aparência* dá para trocar o visual do app. O **Padrão** é
  o grafite com verde de sempre; o **GTA VI** pinta tudo com o pôr do sol neon —
  noite roxa, rosa e laranja em degradê e o verde-água do mar. A escolha vale para
  o aparelho (fica fora do backup) e é aplicada antes da primeira pintura, sem piscar.
- **Backup**: dois caminhos separados — **importar plano** mescla e preserva todo o
  histórico; **restaurar backup** substitui tudo. Arquivos de versões anteriores são
  convertidos na importação.

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

Quando sai versão nova, o app instalado mostra a barra **Nova versão disponível →
Atualizar**. Ele procura de hora em hora e sempre que volta para a frente; não há
número de versão para subir à mão, o build já muda o service worker a cada deploy.

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
               histórico, catálogo, arena, ajustes)
  components/  peças reutilizáveis (modais, timer, shell, ícones)
  hooks/       cronômetro por timestamp e wake lock
  lib/         formatação pt-BR, ids, feedback sonoro, temas e contas de força
```

O modelo de dados vai de `Workout → WorkoutItem → SetBlock → SetLog`. O `SetLog`
guarda `exerciseId` (peso lembrado entre treinos) **e** `blockId` (peso lembrado por
bloco, para o feeder não herdar a carga do working). Com formas de fazer, guarda
também o `variantId`: o histórico é de exercício + forma, e as regras de qual série
pertence a qual forma moram em `src/lib/variants.ts`. Uma troca temporária fica em
`Session.swaps`, e as séries feitas nela levam `swapped`.

## Stack

React 19 · TypeScript · Vite 6 · Dexie (IndexedDB) · React Router (HashRouter) ·
Recharts · vite-plugin-pwa
