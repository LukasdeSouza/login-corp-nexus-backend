# Login Corp Nexus Backend

API Backend para o sistema Login Corp Nexus, construída com Node.js e Express.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **CORS** - Cross-Origin Resource Sharing
- **Helmet** - Middleware de segurança
- **Morgan** - Logger HTTP
- **Express Rate Limit** - Rate limiting
- **dotenv** - Variáveis de ambiente

## 📁 Estrutura do Projeto

```
src/
├── middleware/          # Middlewares da aplicação
│   ├── auth.js         # Autenticação e autorização
│   └── validation.js   # Validação de dados
├── routes/             # Definição das rotas
│   ├── auth.js         # Rotas de autenticação
│   ├── users.js        # Rotas de usuários
│   └── health.js       # Health check
├── utils/              # Utilitários
│   └── response.js     # Helpers para resposta da API
└── server.js           # Arquivo principal do servidor
```

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```

4. Configure as variáveis de ambiente no arquivo `.env`

## ▶️ Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O servidor estará disponível em: `http://localhost:3000`

## 📡 Endpoints da API

### Health Check
- `GET /api/health` - Status básico da API
- `GET /api/health/status` - Status detalhado

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/forgot-password` - Recuperar senha
- `POST /api/auth/reset-password` - Redefinir senha

### Usuários
- `GET /api/users/profile` - Obter perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil
- `PUT /api/users/change-password` - Alterar senha
- `DELETE /api/users/account` - Excluir conta
- `GET /api/users` - Listar usuários (admin)
- `PUT /api/users/:id/role` - Alterar role (admin)

## 🔧 Próximos Passos

Para completar o desenvolvimento, você precisará implementar:

1. **Banco de Dados**
   - Escolher e configurar (PostgreSQL, MongoDB, etc.)
   - Criar modelos/schemas
   - Implementar conexão

2. **Autenticação JWT**
   - Instalar `jsonwebtoken`
   - Implementar geração e validação de tokens
   - Sistema de refresh tokens

3. **Hash de Senhas**
   - Instalar `bcrypt`
   - Implementar hash e comparação

4. **Validação Robusta**
   - Instalar `joi` ou `express-validator`
   - Melhorar validações

5. **Testes**
   - Configurar Jest
   - Testes unitários e de integração

6. **Deploy**
   - Configurar para produção
   - Variables de ambiente de produção

## 🔒 Segurança

A API já inclui:
- Helmet para headers de segurança
- Rate limiting
- CORS configurado
- Validação básica de entrada

## 📝 Licença

ISC

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
