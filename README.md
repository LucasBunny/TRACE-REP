# TRACE-REP LITE — Sistema de Monitoramento de Repetidoras

**Sistema web de monitoramento e gestão de repetidoras de rádio — protótipo acadêmico.**

O **TRACE-REP LITE** foi desenvolvido como Projeto Integrador (PI) da **UNIVESP**. A proposta é centralizar informações sobre repetidoras de rádio, acompanhar indicadores de funcionamento, identificar possíveis falhas e registrar intervenções de manutenção em uma interface web.

Nesta etapa, a telemetria é **simulada por dispositivos ESP32 no Wokwi**. O sistema integra uma aplicação web, uma API REST, um banco de dados em nuvem e cenários de falha controlados. **Não realiza, nesta versão, medições diretas em repetidoras físicas.**

**Demonstração:** https://trace-rep.vercel.app/
**Repositório:** https://github.com/LucasBunny/TRACE-REP

---

## Objetivo

Apoiar o acompanhamento operacional de repetidoras de rádio, reunindo em um único ambiente os estados dos equipamentos, os registros de telemetria, os alertas e o histórico de manutenção. O projeto também demonstra uma arquitetura que pode ser adaptada futuramente para equipamentos reais.
## Visão geral

O TRACE-REP LITE possui as seguintes áreas na interface:

- **Visão geral:** indicadores operacionais, gráfico de telemetria, resumo da saúde do sistema, repetidoras monitoradas e eventos recentes.
- **Repetidoras:** consulta e gerenciamento do inventário de equipamentos.
- **Central de alertas:** visualização, filtragem e reconhecimento de ocorrências.
- **Manutenções:** registro e consulta do histórico de intervenções.
- **Relatórios:** indicadores e exportação de dados em CSV.
- **Stack & requisitos:** documentação visual das tecnologias e dos requisitos do projeto.

A interface utiliza a API para carregar repetidoras, alertas, manutenções e histórico de telemetria. Quando não consegue consultar a API, o JavaScript mantém dados demonstrativos locais para permitir a visualização do protótipo.

## Tecnologias

| Camada | Tecnologia | Utilização |
|---|---|---|
| Front-end | HTML, CSS e JavaScript | Interface, navegação, gráficos, formulários e interação com a API |
| Back-end | Node.js e Express | Servidor web e implementação da API REST |
| Banco de dados | PostgreSQL (Supabase) | Persistência de repetidoras, alertas, manutenções e histórico de telemetria |
| Acesso ao banco | `pg` (node-postgres) | Conexão entre a API e o PostgreSQL |
| Dispositivo | ESP32 | Envio de leituras de telemetria por HTTP |
| Versionamento | Git e GitHub | Histórico e colaboração no código |
| Desenvolvimento embarcado | PlatformIO e arquivos de simulação Wokwi | Configuração e apoio ao desenvolvimento do dispositivo |

> A comunicação de telemetria implementada no servidor é feita por HTTP, por meio de `POST /api/telemetry/ingest`. Não há uma rota MQTT implementada no `server.js` fornecido.

## Arquitetura

```text
ESP32 simulado no Wokwi (main.cpp)
          |
          | HTTP POST /api/telemetry/ingest (JSON)
          v
   API REST em Node.js / Express
          |
          | Consultas e atualizações
          v
     Supabase / PostgreSQL
          ^
          |
          | Requisições HTTP
          |
   Interface web (HTML/CSS/JS)
```

Cada ESP32 simulado envia leituras periódicas identificadas pelo código de sua repetidora, como `REP-001` ou `REP-002`. A API valida os dados, atualiza o cadastro, registra o histórico e avalia condições de alerta. A interface consulta a API para apresentar as informações.

## Indicadores e regras de demonstração

| Condição | Regra utilizada |
| --- | --- |
| Temperatura elevada | Temperatura acima de **60 °C** |
| Subtensão | Tensão abaixo de **11 V** |
| Falha de RF de entrada (RX) | `rf_in` menor ou igual a **20%** |
| Falha de RF de saída (TX) | `rf_out` menor ou igual a **20%** |
| Canal ocupado | `channel_busy = true` (atenção) |
| Perda de comunicação | Ausência de telemetria por mais de **45 segundos** |

Esses limites são **parâmetros utilizados no protótipo**, não especificações universais de repetidoras reais. Em uma implantação física, os valores devem ser definidos conforme o fabricante, o modelo e as condições operacionais.

**Importante:** o estado de comunicação com a API é diferente do estado do rádio. Uma repetidora pode estar **online no monitoramento** e apresentar **falha de RX ou TX**. A variável `signal` também é distinta dos campos `rf_in` e `rf_out` no modelo atual.

## Cenários de simulação

O sistema permite simular, individualmente:

1. **Temperatura elevada** — aumento artificial da temperatura.
2. **Subtensão** — redução artificial da tensão; na lógica atual, esse cenário também simula interrupção do recebimento de telemetria.
3. **Falha de RX** — redução de `rf_in` a zero, mantendo a comunicação do dispositivo com o servidor.
4. **Falha de TX** — redução de `rf_out` a zero, mantendo a comunicação do dispositivo com o servidor.
5. **Canal ocupado** — marcação de ocupação do canal, gerando estado de atenção.

Enquanto uma simulação está ativa, o backend preserva as métricas simuladas em vez de sobrescrevê-las com as leituras normais recebidas do ESP32. Ao encerrar a simulação, a próxima telemetria pode atualizar os valores novamente.

---

## Funcionalidades disponíveis

### Monitoramento de repetidoras

A API permite cadastrar, consultar, atualizar e excluir repetidoras. As informações podem incluir identificador, nome, localização, estado operacional, temperatura, tensão, sinal e coordenadas.

O servidor também acompanha o horário da última comunicação. Uma repetidora que já tenha enviado telemetria e fique mais de **45 segundos** sem transmitir pode gerar um alerta de perda de comunicação.

### Telemetria

O endpoint de ingestão recebe leituras enviadas por dispositivos ou ferramentas de teste. Os campos obrigatórios são:

- `id`: identificador da repetidora cadastrada;
- `temp`: temperatura;
- `voltage`: tensão;
- `signal`: nível de sinal, de 0 a 100.

Também podem ser enviados `rf_in`, `rf_out` e `channel_busy`.

As leituras recebidas atualizam os dados da repetidora e são registradas no histórico de telemetria. A interface consulta esse histórico para alimentar o gráfico.

### Alertas e simulações

A API permite criar alertas, consultar ocorrências por estado de reconhecimento e severidade e reconhecer alertas individualmente ou em lote.

Também existem rotas para iniciar e encerrar simulações de falhas operacionais, incluindo temperatura elevada, subtensão, falhas de RF e canal ocupado. Essas simulações servem para demonstrar o comportamento do sistema e não representam, por si só, uma falha detectada em um equipamento físico.

### Manutenções e relatórios

Os registros de manutenção são associados a uma repetidora e armazenam tipo de serviço, técnico, data e observação. A interface também oferece exportação de dados e relatórios em CSV.

---

## Estrutura do projeto

A organização principal do repositório é baseada em arquivos na raiz e pastas de apoio:

```text
TRACE-REP/
├── database/          # Arquivos relacionados à estrutura do banco de dados
├── data/              # Dados e arquivos de apoio do projeto
├── src/               # Código-fonte do projeto embarcado
├── index.html         # Interface principal
├── login.html         # Tela de login
├── styles.css         # Estilos da interface
├── client.js          # Lógica do front-end e comunicação com a API
├── server.js          # Servidor Express e rotas da API REST
├── package.json       # Dependências e scripts do Node.js
├── env.example        # Exemplo de variáveis de ambiente
├── platformio.ini     # Configuração do PlatformIO
├── diagram.json       # Diagrama do circuito/simulação
├── wokwi.toml         # Configuração do Wokwi
├── .gitignore
└── README.md
```

**Atenção ao versionamento:** o `server.js` disponibiliza a rota `/login.html`. Portanto, o arquivo `login.html` precisa estar na raiz do projeto junto com `index.html`, `client.js` e `styles.css`. O arquivo `login.html` foi fornecido junto com os materiais desta atualização; confirme se ele também está commitado no GitHub.

---

## Requisitos para execução local

- Node.js 18 ou superior;
- npm;
- uma instância PostgreSQL acessível;
- banco de dados configurado no Supabase;
- estrutura de tabelas esperada pela API criada no banco.

O servidor utiliza a variável `DATABASE_URL` para conectar ao PostgreSQL. Sem ela, a inicialização da API é interrompida.

## Configuração do ambiente

### 1. Clone o repositório

```bash
git clone https://github.com/LucasBunny/TRACE-REP.git
cd TRACE-REP
```

### 2. Instale as dependências

```bash
npm install
```

O `package.json` define os scripts `dev` e `start`, além das dependências do Express, CORS, dotenv e `pg`.

### 3. Crie o arquivo `.env`

Copie o arquivo de exemplo:

```bash
cp env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item env.example .env
```

Abra o `.env` e configure a conexão do Supabase. O `env.example` fornecido contém `PORT` e `CORS_ORIGIN`, mas não contém `DATABASE_URL`; portanto, adicione essa variável manualmente:

```env
PORT=3000
DATABASE_URL=sua_string_de_conexao_postgresql_do_supabase
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
```

Obtenha a string de conexão no painel do projeto Supabase. Não publique o valor real de `DATABASE_URL`, não o envie para o GitHub e não o coloque em arquivos do front-end.

### 4. Prepare o banco de dados

Antes de iniciar a API, configure no Supabase as tabelas e colunas esperadas pelo servidor. Consulte os arquivos disponíveis na pasta `database/`.

O código do servidor utiliza, entre outras, as tabelas:

- `public.repeaters`;
- `public.alerts`;
- `public.maintenances`;
- `public.telemetry_history`.

As rotas de comunicação e simulação também utilizam campos de controle de comunicação e de falha simulada na tabela de repetidoras. O esquema do banco precisa estar compatível com essas operações.

### 5. Inicie a aplicação

Para desenvolvimento:

```bash
npm run dev
```

Para execução normal:

```bash
npm start
```

Por padrão, o servidor utiliza a porta `3000`. Acesse:

- Aplicação: http://localhost:3000
- Tela de login: http://localhost:3000/login.html
- Verificação da API: http://localhost:3000/api/health

O caminho `/` redireciona para a tela de login. Para que as chamadas relativas a `/api` funcionem no ambiente local, prefira acessar a interface pelo servidor Express em vez de abrir o HTML diretamente como arquivo ou por um servidor estático separado.

---

## Acesso demonstrativo

O código atual de `server.js` implementa um login demonstrativo com as seguintes credenciais locais:

| Campo | Valor |
|---|---|
| Usuário | `admin` |
| Senha | `1234` |

Essas credenciais estão fixas no código e servem apenas para demonstração. O front-end armazena um token fixo no `localStorage` para controlar a exibição da interface.

**Limitação de segurança:** isso não equivale a autenticação de produção. As rotas de dados da API não validam esse token e não possuem autorização por usuário. Não exponha o serviço publicamente com esse mecanismo; implemente autenticação e autorização reais antes de utilizá-lo em produção.

---

## API REST

A API utiliza JSON nas requisições e respostas.

### Saúde e indicadores

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica a disponibilidade da API e a conexão com o banco |
| GET | `/api/dashboard/summary` | Retorna os indicadores gerais do sistema |

### Repetidoras

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/repeaters` | Lista as repetidoras; aceita `?status=ok`, `warn` ou `bad` |
| GET | `/api/repeaters/:id` | Consulta uma repetidora pelo identificador |
| POST | `/api/repeaters` | Cadastra uma repetidora |
| PUT | `/api/repeaters/:id` | Atualiza os dados de uma repetidora |
| DELETE | `/api/repeaters/:id` | Exclui uma repetidora |

### Telemetria

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/telemetry/ingest` | Recebe uma leitura de telemetria |
| GET | `/api/telemetry?seconds=43200` | Consulta o histórico dentro do período informado |

O parâmetro `seconds` aceita valores inteiros de 1 a 86400. Na ausência do parâmetro, o servidor utiliza 43200 segundos (12 horas).

Exemplo de corpo JSON para envio de telemetria:

```json
{
  "id": "REP-001",
  "temp": 42.5,
  "voltage": 12.2,
  "signal": 78,
  "rf_in": 90,
  "rf_out": 88,
  "channel_busy": false
}
```

Envie esse conteúdo por `POST /api/telemetry/ingest`, com o cabeçalho `Content-Type: application/json`. O identificador precisa corresponder a uma repetidora já cadastrada.

### Alertas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/alerts` | Lista alertas; aceita filtros `ack=true`, `ack=false` e `severity=critical`, `warning` ou `info` |
| POST | `/api/alerts` | Cria um alerta |
| PATCH | `/api/alerts/:id/acknowledge` | Reconhece um alerta |
| POST | `/api/alerts/acknowledge-all` | Reconhece todos os alertas pendentes |

### Manutenções

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/maintenances` | Lista manutenções; aceita `?device=REP-001` |
| POST | `/api/maintenances` | Registra uma manutenção |

Os tipos de manutenção aceitos pelo servidor são `Preventiva`, `Corretiva`, `Instalação` e `Inspeção`.

### Simulações

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/simulations/start` | Inicia uma simulação de falha para uma repetidora |
| POST | `/api/simulations/stop` | Encerra a simulação ativa de uma repetidora |
| POST | `/api/simulations/temperature` | Executa a simulação específica de temperatura elevada |

Para `/api/simulations/start`, o corpo JSON deve informar `device` e `fault`. Os valores de `fault` aceitos são `temperature`, `voltage`, `rf_in`, `rf_out` e `channel_busy`.

Exemplo:

```json
{
  "device": "REP-001",
  "fault": "temperature"
}
```

Para encerrar a simulação:

```json
{
  "device": "REP-001"
}
```

---

## Tratamento de comunicação e status

O servidor calcula o estado operacional com base nas leituras recebidas. Entre as condições consideradas estão temperatura acima de 60 °C, tensão abaixo de 11 V, nível de RF de entrada ou saída igual ou inferior a 20% e canal ocupado.

A comunicação é avaliada separadamente do funcionamento do equipamento. Quando uma repetidora que já transmitiu deixa de enviar telemetria por mais de 45 segundos, o back-end pode registrar um alerta de perda de comunicação.

Os limites descritos são os valores definidos atualmente no código do servidor e podem ser alterados conforme os requisitos do projeto.

---

## Publicação e variáveis de ambiente

O servidor exporta a aplicação Express e contém comentários de suporte a execução em ambiente serverless, como a Vercel. Para publicar, configure no provedor as variáveis de ambiente necessárias, especialmente `DATABASE_URL`, `PORT` quando aplicável e `CORS_ORIGIN`.

O servidor já inclui algumas origens locais e o domínio `https://trace-rep.vercel.app` na lista permitida por CORS. Ajuste essa lista para os domínios realmente utilizados. CORS não substitui autenticação ou autorização.

---

## Contexto acadêmico

Projeto Integrador da **Universidade Virtual do Estado de São Paulo (UNIVESP)**, voltado à aplicação prática de desenvolvimento web, JavaScript, API, banco de dados, computação em nuvem, versionamento e integração com dispositivos simulados.


**TRACE-REP LITE — monitoramento, rastreabilidade e apoio à manutenção de repetidoras de rádio.**

---

## Contribuição e versionamento

Para atualizar o repositório:

```bash
git status
git add README.md
git commit -m "Atualiza documentação do TRACE-REP LITE"
git push
```

Consulte o repositório para acompanhar as alterações:

https://github.com/LucasBunny/TRACE-REP
