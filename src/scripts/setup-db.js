const db = require('../config/database');

const setupDatabase = async () => {
  console.log('🚀 Iniciando configuração do banco de dados...\n');
  
  try {
    // Testar conexão
    console.log('1️⃣ Testando conexão com o banco...');
    const connected = await db.testConnection();
    
    if (!connected) {
      console.log('❌ Falha na conexão. Verifique as configurações.');
      process.exit(1);
    }
    
    console.log('');
    
    // Verificar tabelas existentes
    console.log('2️⃣ Verificando tabelas existentes...');
    await db.checkTables();
    
    console.log('');
    
    // Criar tabelas
    console.log('3️⃣ Criando/atualizando estrutura das tabelas...');
    await db.createTables();
    
    console.log('');
    
    // Inserir dados de exemplo
    console.log('4️⃣ Inserindo dados de exemplo...');
    await db.insertSampleData();
    
    console.log('');
    
    // Verificar novamente as tabelas
    console.log('5️⃣ Verificando estrutura final...');
    await db.checkTables();
    
    console.log('\n✅ Configuração do banco concluída com sucesso!');
    console.log('🎉 O banco está pronto para uso!\n');
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error.message);
    process.exit(1);
  } finally {
    // Fechar conexões
    await db.pool.end();
    process.exit(0);
  }
};

// Executar setup se o arquivo for chamado diretamente
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
