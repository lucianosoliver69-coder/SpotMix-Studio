# SpotMix Studio — Netlify

Projeto independente do servidor S23. Frontend estático em `public/`; funções em `netlify/functions/`.

## Publicar

1. Importe esta pasta como repositório Git na Netlify. A configuração de build já está em `netlify.toml`.
2. Em **Site configuration → Environment variables**, crie `GEMINI_API_KEY` com a chave existente, com escopo **Functions**. Não a coloque em `netlify.toml`, repositório ou navegador.
3. Defina `GEMINI_TTS_MODEL=gemini-3.8-flash-tts` no mesmo painel; faça novo deploy.
4. Teste `/api/voices` e uma geração de voz no aplicativo. A disponibilidade de cada ID depende do acesso daquela chave à voz na conta Google.

## Estado atual

Os projetos e as amostras ficam no armazenamento do navegador desta instalação. Essa opção permite revisão e uso imediato sem credenciais adicionais, mas não sincroniza projetos entre aparelhos. A mixagem/exportação WAV acontece no navegador; exportação MP3 e download de YouTube não estão implementados. Para guardar áudios e projetos na nuvem e dar acesso a vários usuários, ainda é necessário definir autenticação e armazenamento durável. O usuário só deve enviar trilhas que tenha direito de utilizar.

Para teste local de funções, use `npx netlify dev` após configurar o ambiente local; não publique `.env`.
