# Conferência de O.S. — Implantar Telecom

Aplicativo de conferência de ordens de serviço com janela flutuante para Windows.

## Como gerar o instalador

1. Copie esta pasta para um computador Windows 10/11
2. Clique duas vezes em **CONSTRUIR.bat**
3. Aguarde (primeira vez pode demorar ~5 min — baixa o Electron)
4. O instalador será gerado na pasta `dist/`
5. Execute o instalador nos computadores da operação

## O que o app faz

- Ícone na bandeja do sistema (canto inferior direito do Windows)
- Clique no ícone → janela flutuante abre **sobre todos os outros programas**
- Selecione o tipo de O.S. (Instalação ou Manutenção)
- Informe o nome do técnico
- Marque as pendências
- Clique "Confirmar e copiar" → texto copiado automaticamente
- Cole na observação da O.S. (Ctrl+V)

## Requisitos para BUILD

- Windows 10/11
- Node.js v20+ (o script CONSTRUIR.bat instala automaticamente se necessário)
- Conexão com internet (apenas para o build)

## Após instalado

O app não precisa de internet para funcionar.
