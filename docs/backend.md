# Backend

## Architecture

A requisição chega através da interface da API e é encaminhada ao `ImageProcessingService`, responsável por coordenar o processamento.

A preparação da operação é realizada pelo `ImagePreparationService`, que primeiro valida os arquivos de entrada através do `InputValidator`. Após a validação, os dados são lidos em memória, decodificados pelo `ImageDecoder` e normalizados pelo `NormalizeProcessor`.

Com as imagens preparadas, a operação é executada pelo processador correspondente — atualmente, o `BlendProcessor`.

O resultado é então enviado ao `ImageEncoder`, que o transforma na representação de resposta, retornada pela API.

---

## API Contract

O backend expõe uma interface HTTP para processamento de imagens.

### Stateless Processing

A entrada stateless utiliza o endpoint `/blend` e exige:

- `implicit_image_a`
- `implicit_image_b`
- `width`
- `height`

As duas imagens são recebidas como upload e processadas em memória.

### Reentry

A entrada de reentry utiliza o endpoint `/reentry` e recebe um arquivo de reentrada.

O backend valida o arquivo, recupera a operação armazenada e encaminha a operação para o mesmo pipeline de processamento.

### Supported Images

Os formatos de imagem aceitos são definidos por `SUPPORTED_IMAGE_TYPES`.

### Response

A resposta atual do processamento é a imagem resultante em formato PNG.

### Endpoints

#### `/blend`

Recebe duas imagens, normaliza ambas para o tamanho solicitado e executa a operação de blend, retornando a imagem resultante.

#### `/reentry`

Recebe um arquivo de reentrada, valida seu conteúdo, recupera a operação e a encaminha para o pipeline de processamento.

#### `/health`

Expõe o estado operacional atual do serviço.

#### `/ready`

Indica se o serviço está pronto para processar requisições.

#### `/metrics`

Expõe as métricas de observabilidade do aplicativo.

---

## Resilience

A resiliência do MEXE é orientada à continuidade da operação.

Quando uma operação está em execução e a comunicação com o backend é interrompida, o laboratório não descarta imediatamente o trabalho atual.

O frontend mantém o contexto necessário para recuperar a operação e a memória de resiliência registra o estado mínimo necessário para identificar o processo interrompido.

### Recovery

O fluxo de recuperação é:

```text
Processing
    ↓
Backend indisponível
    ↓
Reconnecting
    ↓
Tentativa de recuperação
    ↓
 ┌───────────────┐
 │               │
Sucesso       Falha
 │               │
 ↓               ↓
Result         Offline
                 │
          ┌──────┼──────┐
          ↓      ↓      ↓
       Retry   Salvar  Reset
               sessão
```

Durante a recuperação, o contexto da operação permanece disponível para que ela possa ser executada novamente.

O controlador de operações utiliza esse contexto para realizar um retry manual ou uma reentrada, dependendo do modo da operação.

### Estado Preservado

O contexto operacional contém:

- operação selecionada;
- modo da operação;
- primeira imagem;
- segunda imagem.

A memória de resiliência mantém apenas o estado mínimo do processo interrompido:

- `type`;
- `phase`;
- `operationPhase`.

Essa separação evita que a memória de recuperação precise conhecer toda a estrutura do laboratório.

### Opções após a falha

Quando a recuperação automática não consegue restabelecer o processamento, o laboratório entra em `offline`.

Nesse estado, o usuário possui três caminhos.

#### 1. Tentar novamente

O usuário pode solicitar manualmente uma nova tentativa da operação.

O retry utiliza o contexto preservado e pode executar tanto um retry normal quanto uma reentrada, dependendo do modo da operação.

#### 2. Salvar a sessão

O usuário pode salvar o trabalho atual como uma sessão de reentrada.

A sessão é gerada a partir das duas imagens mantidas pelo contexto do laboratório e disponibilizada para download.

Isso permite abandonar a conexão atual sem perder o trabalho.

#### 3. Resetar o laboratório

O usuário pode descartar o estado atual e retornar ao fluxo normal.

O reset limpa as imagens mantidas pelo frontend e reinicia o processo correspondente.
