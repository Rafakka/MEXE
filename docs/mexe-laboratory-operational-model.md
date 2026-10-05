# MEXE LABORATORY — OPERATIONAL MODEL

> Este documento descreve como o Laboratory organiza estado, operação, contexto, navegação e recuperação.
>
> Ele define o modelo que as operações devem seguir para participar do workflow existente sem criar um fluxo paralelo.

---

# 1. LABORATORY STATE MODEL

O Laboratory utiliza diferentes dimensões de estado para representar aspectos distintos do workflow.

| Campo | Responde à pergunta | Exemplo |
|---|---|---|
| `phase` | Onde o Laboratory está? | `activated` |
| `operationPhase` | O que a operação está fazendo? | `running` |
| `operation` | Qual operação está sendo executada? | `blend` |
| `mode` | Como a operação foi iniciada? | `reentry` |

A distinção fundamental é:

```text
phase          = localização estrutural
operationPhase = progresso operacional
operation      = trabalho escolhido
mode           = caminho de entrada
```

Essas dimensões não são intercambiáveis.

```text
phase
  └── descreve o estado estrutural do Laboratory

operationPhase
  └── descreve o estado interno da operação

operation
  └── identifica o trabalho executado

mode
  └── identifica o caminho de entrada da operação
```

### Regra

Os componentes do frontend devem reagir somente às dimensões de estado relevantes para sua responsabilidade.

Um componente transversal pode reagir a `phase` sem precisar conhecer `mode`.

Uma operação específica pode reagir a `operation` e `operationPhase` sem precisar modificar a estrutura geral do Laboratory.

---

# 2. OPERATION FLOW

Uma operação sempre começa a partir de uma ação ou input do usuário.

Existem dois caminhos principais de entrada:

```text
                    USER INPUT
                        │
             ┌──────────┴──────────┐
             │                     │
        normal input             reentry
             │                     │
             │                  .mx file
             │                     │
             └──────────┬──────────┘
                        ▼
                 validated data
                        │
                        ▼
                 LabContext
                        │
                        ▼
                  Laboratory
                        │
                        ▼
                 operation flow
```

No caso de `blend`, duas imagens são necessárias.

O fluxo não executa a mescla imediatamente após a segunda seleção. A validação dos arquivos permite que o Laboratory avance em seu workflow, passando por suas etapas visuais e operacionais até que `startOperation()` possa iniciar a operação.

Simplificadamente:

```text
Input
  ↓
Validation
  ↓
synchronizing
  ↓
revealing
  ↓
startOperation()
  ↓
processing
  ↓
backend request
  ↓
result / failure
```

A execução dos dados segue **para frente dentro do workflow**. O retorno ocorre através de resultado, falha ou mecanismos explícitos de recuperação, e não através da criação de um fluxo de execução reverso.

---

# 3. LAB CONTEXT

O `LabContext` reúne os dados necessários para executar uma operação.

Atualmente:

```ts
type LabContext = {
    operation: LaboratoryOperation;
    mode: LaboratoryMode;
    firstFile: File | null;
    secondFile: File | null;
};
```

Portanto:

```text
LabContext
├── operation
├── mode
├── firstFile
└── secondFile
```

Ele representa o **contexto operacional**, não uma cópia completa do estado do Laboratory.

O contexto é criado quando os dados necessários para a operação estão disponíveis:

```ts
const labContext = createLabContext(
    operation,
    mode,
    firstFile,
    secondFile
);
```

Esse contexto pode então ser utilizado pelos controllers para iniciar ou tentar novamente uma operação.

No fluxo de `reentry`, os dados persistidos em `.mx` são usados para reconstruir os arquivos e a operação, permitindo que um novo `LabContext` seja formado e a execução seja retomada.

### Regra

```text
LabContext = contexto necessário para executar
.mx        = representação persistida desse contexto
```

Eles possuem responsabilidades diferentes.

---

# 4. OPERATION CONTROLLER

O Laboratory não executa diretamente cada operação.

O `labOpController` funciona como ponto de entrada para a execução:

```text
Laboratory
    │
    ▼
LabContext
    │
    ▼
labOpController
    │
    ├── startOperation()
    │
    └── retryOperation()
```

A operação normal utiliza `startOperation()`.

A recuperação/reentrada utiliza `retryOperation()`.

A diferença de entrada é determinada pelo `mode`:

```text
mode = stateless
    → manualRetry()

mode = reentry
    → manualReentry()
```

Isso permite que operações diferentes utilizem o mesmo mecanismo estrutural de execução sem criar um controller independente para cada uma.

---

# 5. MODELO DE EXTENSÃO

Uma nova `operation` deve se integrar ao modelo existente do Laboratory.

Ao adicionar uma operação, é necessário definir:

```text
1. quais dados ela recebe
2. quais componentes do frontend participam
3. quais estados ela observa
4. como sua execução é registrada
5. como participa da recuperação
```

A operação deve utilizar as dimensões existentes:

```text
operation
    → identifica a operação

mode
    → distingue os caminhos de entrada

phase
    → representa a posição estrutural

operationPhase
    → representa o progresso operacional
```

### Exemplo

Uma futura operação:

```text
filter
```

poderia compartilhar a estrutura do Laboratory existente, mas possuir componentes e etapas próprias.

O objetivo não é criar:

```text
Blend Laboratory
Resize Laboratory
Filter Laboratory
```

O objetivo é manter:

```text
                 Laboratory
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      blend        resize       filter
```

A operação nova se adapta ao workflow existente.

> **Uma nova `operation` deve se adaptar ao modelo do Laboratory, e não criar um novo modelo de execução.**

---

# 6. PROCESS REGISTRY

A execução da operação é conectada ao Laboratory através do `processRegistry`.

Hoje o `blend` é registrado como um handler:

```ts
registerProcess(
    "blend",
    async (firstFile, secondFile) => {
        await dispatch(
            performMerge(firstFile, secondFile)
        );
    }
);
```

Conceitualmente:

```text
operation
    │
    ▼
processRegistry
    │
    ▼
ProcessHandler
    │
    ▼
backend operation
```

Isso permite que a recuperação procure o handler da operação interrompida sem precisar conhecer a implementação específica de cada operação.

---

# 7. NAVEGAÇÃO

A navegação do Laboratory é deliberadamente concisa.

O princípio é:

```text
avançar → workflow
voltar   → intenção explícita do usuário
resetar  → novo ciclo
```

O `Back` possui um papel específico: permitir que o usuário abandone o fluxo **antes de sua execução efetiva avançar para o processamento da operação**.

Depois que o fluxo deixa esse contexto, o `Back` não é usado para desfazer o processamento.

O `Reset` representa o início de um novo ciclo do Laboratory.

Conceitualmente:

```text
User
 │
 ▼
Laboratory
 │
 ├── Back ──→ abandonar contexto atual
 │
 ▼
Operation
 │
 ├── success
 │
 └── failure
       │
       ▼
     Reset
       │
       ▼
     Idle
```

### Regra

```text
Back  = abandonar o contexto atual
Reset = iniciar um novo ciclo
```

Isso mantém a navegação previsível e evita transformar o `Back` em mecanismo de rollback operacional.

---

# 8. RESILIENCE MODEL

A resiliência utiliza duas estruturas diferentes:

```text
LabContext
    → dados necessários para executar/reconstruir

resilienceMemory
    → mínimo necessário para identificar e retomar o processo
```

A memória de resiliência registra:

```ts
type RecoveryProcess = {
    type: LaboratoryOperation;
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
};
```

Ou seja:

```text
RecoveryProcess
├── type
├── phase
└── operationPhase
```

Ela não precisa armazenar todo o estado do Laboratory.

Seu objetivo é preservar o **mínimo necessário para reconhecer o processo interrompido e reconstruir sua execução**.

---

# 9. RECOVERY FLOW

Antes da execução do processo, a memória registra o processo que está sendo executado.

Se houver falha de comunicação com o backend:

```text
running
   │
   ▼
reconnecting
   │
   ├───────────────┐
   │               │
   ▼               ▼
recovered        offline
   │               │
   ▼               ├── retry
restore state      ├── reset
                   └── save .mx
```

A recuperação distingue três situações:

### Recuperação automática

O sistema tenta recuperar a comunicação e continuar a operação.

### Recuperação manual

O usuário pode solicitar uma nova tentativa.

### Persistência

Quando a operação não pode continuar naquele momento, os dados necessários podem ser preservados em uma sessão `.mx` para posterior `reentry`.

Assim:

```text
                 FAILURE
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       automatic  manual     .mx
         retry     retry     session
          │         │         │
          └─────────┴────┬────┘
                         ▼
                       resume
```

### Regra

> **A resiliência preserva o mínimo necessário para continuar o fluxo, não uma cópia completa do estado do Laboratory.**

---

# 10. VISÃO GERAL

Todo o modelo pode ser reduzido a esta sequência:

```text
                         USER
                          │
                          ▼
                    ┌───────────┐
                    │   Input   │
                    └─────┬─────┘
                          │
                ┌─────────┴─────────┐
                │                   │
             normal              reentry
                │                  .mx
                └─────────┬─────────┘
                          ▼
                    ┌───────────┐
                    │ Validation│
                    └─────┬─────┘
                          ▼
                    ┌───────────┐
                    │ LabContext│
                    └─────┬─────┘
                          ▼
                 ┌──────────────────┐
                 │  Operation Flow  │
                 └────────┬─────────┘
                          ▼
                  ┌───────────────┐
                  │ProcessRegistry│
                  └───────┬───────┘
                          ▼
                       Backend
                          │
                    ┌─────┴─────┐
                    │           │
                 success      failure
                    │           │
                    ▼           ▼
                 result      recovery
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  retry      manual        .mx
                    │           │           │
                    └───────────┴─────┬─────┘
                                      ▼
                                    reentry
```

## O modelo em uma frase

> **O usuário inicia uma operação, o Laboratory conduz seu workflow através de estados explícitos, o `LabContext` reúne o contexto necessário para executá-la, o registry conecta a operação à execução e a camada de resiliência preserva apenas o necessário para recuperá-la.**
