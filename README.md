# Corretor ENEM 2026

Site estatico em HTML, CSS e JavaScript. Os arquivos deste diretorio sao a raiz do projeto para GitHub e Vercel.

## Publicar no Vercel

1. Importe o repositorio `secnuc27-del/corretor-enem-2026` no Vercel.
2. Use o preset **Other**. Nao informe comando de build nem comando de instalacao; deixe o diretorio de saida no padrao.
3. O arquivo `vercel.json` configura os cabecalhos de seguranca. O `.vercelignore` remove do deploy o servidor local e os arquivos `.bat`.
4. Depois do primeiro deploy, adicione o dominio em **Settings > Domains** e configure no registrador exatamente os registros DNS exibidos pelo Vercel.

O Vercel gera HTTPS para os dominios configurados. Aguarde a validacao do dominio e do certificado antes de divulgar o endereco.

## Enviar ao GitHub

Este diretorio ja esta inicializado na branch `main`, com um commit local pronto. Crie um repositorio vazio chamado `corretor-enem-2026` na conta `secnuc27-del`. Nao inicialize o repositorio remoto com README, `.gitignore` ou licenca.

Depois, nesta pasta, execute:

```powershell
git remote add origin https://github.com/secnuc27-del/corretor-enem-2026.git
git push -u origin main
```

O autor do commit usa o endereco `noreply` do GitHub para nao publicar o email pessoal.

## Seguranca e privacidade

Nao coloque tokens, senhas, chaves ou arquivos `.env` no repositorio. O site nao tem backend nem banco de dados; as respostas sao processadas no navegador. Os gabaritos oficiais enviados junto com o site ficam acessiveis a qualquer visitante.
