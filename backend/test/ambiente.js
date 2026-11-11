/**
 * Responsabilidade: ambiente comum dos testes, carregado antes de cada arquivo (--import no script test).
 *
 * Os testes de unidade não usam Redis, mas alguns módulos conectam nele ao serem carregados. Com um
 * backend/.env de desenvolvimento apontando para um Redis, a conexão (ou a reconexão, se ele estiver
 * fora) mantém o processo vivo e o teste nunca termina. Valor vazio aqui vence o .env: o dotenv não
 * sobrescreve variáveis que já existem.
 */
process.env.REDIS_URL = "";
