# TRACE-REP LITE

Pacote Git com o protótipo visual original e uma API REST separada para os dados do sistema.

## Estrutura

```text
trace-rep-lite/
├── frontend/
│   └── index.html        # protótipo original, sem alterações
├── backend/
│   ├── server.js         # API REST em Node.js + Express
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Front-end (protótipo original)

Abra `frontend/index.html` diretamente no navegador ou use uma extensão de servidor local, como Live Server no VS Code. O HTML foi mantido igual ao protótipo: telas, textos, estilos, dados de demonstração e interações não foram alterados.

**Importante:** o front-end original mantém seus dados dentro da própria página durante a sessão. Para preservar o protótipo literalmente sem alterações, ele ainda não faz chamadas à API descrita abaixo.

## Back-end (API REST)

Requisitos: Node.js 18 ou superior e npm.

No terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

No Windows PowerShell, se `cp` não funcionar, use `Copy-Item .env.example .env`.

A API inicia em `http://localhost:3000`. O banco SQLite é criado automaticamente em `backend/data/trace-rep-lite.sqlite`, com dados iniciais demonstrativos. Essa pasta está no `.gitignore` para evitar versionar o banco local.

### Rotas disponíveis

| Método | Rota | Função |
|---|---|---|
| GET | `/api/health` | Estado da API |
| GET | `/api/dashboard/summary` | Resumo dos indicadores |
| GET | `/api/repeaters` | Lista repetidoras; aceita `?status=ok`, `warn` ou `bad` |
| GET | `/api/repeaters/:id` | Detalhes de uma repetidora |
| POST | `/api/repeaters` | Cadastra repetidora |
| PUT | `/api/repeaters/:id` | Atualiza repetidora |
| DELETE | `/api/repeaters/:id` | Exclui repetidora |
| GET | `/api/alerts` | Lista alertas; aceita filtros `ack` e `severity` |
| POST | `/api/alerts` | Cria alerta |
| PATCH | `/api/alerts/:id/acknowledge` | Reconhece um alerta |
| POST | `/api/alerts/acknowledge-all` | Reconhece todos os alertas pendentes |
| GET | `/api/maintenances` | Lista manutenções; aceita `?device=REP-001` |
| POST | `/api/maintenances` | Registra manutenção |

### Teste rápido

Abra `http://localhost:3000/api/health` no navegador. Para ver as repetidoras, abra `http://localhost:3000/api/repeaters`.

Exemplo de corpo JSON para `POST /api/repeaters`:

```json
{
  "id": "REP-006",
  "name": "Torre E · Leste",
  "location": "São Paulo, SP",
  "status": "ok",
  "temp": 36,
  "voltage": 12.1,
  "signal": 76,
  "updated": "agora"
}
```

## Colocar no GitHub

1. Extraia a pasta `trace-rep-lite-git`.
2. Crie um repositório novo no GitHub.
3. Abra um terminal dentro da pasta extraída e execute:

```bash
git init
git add .
git commit -m "Adiciona prototipo TRACE-REP LITE e API"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Substitua `URL_DO_SEU_REPOSITORIO` pela URL real do repositório que o GitHub mostrar.

## Estado atual e próximos passos

- O protótipo de front-end está preservado sem alterações.
- A API REST e o banco SQLite são funcionais como serviço separado.
- **A interface ainda não está integrada à API.** Conectá-los exige alterar apenas a lógica interna do front-end para fazer chamadas HTTP; a aparência pode permanecer igual.
- Não está publicado na nuvem e não está conectado a ESP32/Wokwi.
- Os dados são demonstrativos; a API ainda não inclui autenticação nem autorização, portanto não deve ser exposta publicamente sem essas proteções.
