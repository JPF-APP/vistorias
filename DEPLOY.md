# Vistorias — Guia de Publicação

Aplicação de gestão de vistorias de segurança contra incêndios (Firebase + GitHub Pages),
seguindo a mesma abordagem da Escala CPO.

## 1. Criar o projeto Firebase

1. Acede a https://console.firebase.google.com/ e cria um novo projeto (ex: `bombeiros-vistorias`).
2. **Authentication** → separador *Sign-in method* → ativa **Email/Palavra-passe**.
3. **Firestore Database** → *Criar base de dados* → modo produção → escolhe a região (ex: `eur3`).
4. **Storage** → *Começar* → modo produção → mesma região.
5. Em **Definições do Projeto** (ícone de engrenagem) → *Geral* → em "As tuas apps", clica no
   ícone `</>` para adicionares uma app Web. Dá-lhe um nome (ex: "Vistorias Web") — **não** precisas
   de ativar Firebase Hosting, vamos usar GitHub Pages.
6. Copia o objeto `firebaseConfig` que aparece e cola-o em `js/firebase-config.js`, substituindo
   os valores `"SUBSTITUIR..."`.

## 2. Publicar as regras de segurança

No separador **Firestore Database → Regras**, cola o conteúdo do ficheiro `firestore.rules`
deste projeto e publica.

No separador **Storage → Regras**, cola o conteúdo do ficheiro `storage.rules` e publica.

(Se preferires usar a Firebase CLI: `firebase deploy --only firestore:rules,storage:rules`
depois de `firebase init` e `firebase use <projeto>`.)

## 3. Publicar no GitHub Pages

1. Cria um repositório novo no GitHub (pode ser privado) e envia todos os ficheiros desta pasta
   (`index.html`, `css/`, `js/`) para o ramo `main`.
2. No repositório: **Settings → Pages** → em "Build and deployment", escolhe *Deploy from a
   branch*, ramo `main`, pasta `/ (root)`. Guarda.
3. Ao fim de 1–2 minutos a app fica disponível em
   `https://<o-teu-utilizador>.github.io/<nome-do-repositorio>/`.

## 4. Criar o primeiro administrador

Por segurança, **toda a conta nova fica automaticamente "Pendente"** ao registar-se na app —
mesmo a primeira. Isto é imposto tanto no código como nas regras do Firestore, para que ninguém
consiga criar-se a si próprio como administrador só por editar o pedido no browser.

Para criares o teu próprio acesso de administrador:

1. Abre a app publicada e cria a tua conta em "Ainda não tenho conta" (fica "Pendente").
2. Na Firebase Console → **Firestore Database → Dados**, abre a coleção `users` e encontra o
   documento com o teu email.
3. Edita o campo `role` de `"pendente"` para `"admin"`.
4. Volta à app, sai e entra de novo (ou atualiza a página) — já tens acesso total, incluindo o
   ecrã **Utilizadores**, onde podes aprovar/promover todos os próximos colegas sem voltar à
   consola.

## 5. Convidar vistoriadores

Cada bombeiro cria a sua própria conta em "Ainda não tenho conta" (fica pendente); um
administrador vai a **Utilizadores** e muda o papel para "Vistoriador" (ou "Admin", se aplicável).

## Notas técnicas

- **Fotos no PDF**: a geração de PDF tenta descarregar as fotos do Firebase Storage para as
  incluir no anexo fotográfico. Isto normalmente funciona sem configuração adicional; se
  reparares que as fotos não aparecem no PDF (apesar de aparecerem na app), o bucket de Storage
  pode precisar de CORS configurado para o domínio do GitHub Pages:

  ```bash
  # cors.json
  [{"origin": ["https://<o-teu-utilizador>.github.io"], "method": ["GET"], "maxAgeSeconds": 3600}]
  ```
  ```bash
  gsutil cors set cors.json gs://<o-teu-projeto>.appspot.com
  ```
  (Requer a `gcloud`/`gsutil` CLI instalada e autenticada.)

- **Fotos ficam guardadas mesmo sem gravar a vistoria**: ao anexares a primeira foto a um item,
  a app cria automaticamente um rascunho da vistoria no Firestore (se ainda não existir), para
  que a foto tenha logo um sítio estável onde ficar. Podes continuar a preencher e só carregar em
  "Guardar" no final.

- **Alterar/expandir a ficha**: todos os campos e secções da ficha de vistoria estão centralizados
  em `js/ficha-schema.js`. Para adicionar, remover ou renomear um campo, basta editar esse
  ficheiro — o formulário de preenchimento e o PDF atualizam-se automaticamente.

- **Custos**: o plano gratuito (Spark) do Firebase costuma ser suficiente para o volume de uma
  associação de bombeiros (Firestore: 50 mil leituras/dia; Storage: 5 GB). Se o volume de fotos
  crescer muito, pode ser necessário passar ao plano Blaze (pago por utilização).
