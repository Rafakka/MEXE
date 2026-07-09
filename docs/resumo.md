# MEXE Laboratory State Story

> Este documento descreve o comportamento do laboratório.
> Não define implementação, apenas a narrativa e os estados da interface.

---

# Filosofia

O laboratório não possui telas.

Ele possui estados.

Cada componente reage aos estados do laboratório.

```
Idle
    ↓
Activated
    ↓
First Sample Loaded
    ↓
Second Sample Loaded
    ↓
Processing
    ↓
Result
```

---

# Componentes

## Core

Centro do laboratório.

Responsável por representar o estado geral do sistema.

Estados:

- Idle
- Activated
- Processing
- Result

---

## CoreSymbol

Representa o "reator".

Nunca é um botão.

Seu objetivo é comunicar visualmente o estado do laboratório.

Estados:

Idle

- Invisível

Hover

- Surge suavemente
- Parece gravado na superfície

Activated

- Acende
- Pequena rotação mecânica
- Permanece ativo

Processing

- Rotação contínua e lenta
- Representa o reator em funcionamento

Result

- Desaparece lentamente

---

## Aura

Representa o campo energético do núcleo.

Idle

- Muito discreta

Activated

- Surge do centro
- Ignição em magenta
- Estabiliza em azul

Processing

- Respira lentamente

Result

- Reduz intensidade

---

## Halo

Representa a luz imediata do núcleo.

Activated

- Expande rapidamente
- Estabiliza

Processing

- Mantém intensidade

---

## SampleAnchor

Responsável apenas pelo movimento.

Nunca representa aparência.

Funções:

- Posicionamento
- Deriva
- Entrada
- Aproximação do Core
- Desaparecimento

---

## SampleNode

Representa a amostra.

Estados:

Pending

- Pedra neutra
- Respiração discreta

Loaded

- Azul
- Glow frio

---

## ReactionField

Representa o espaço de reação.

Idle

- Quase imperceptível

Activated

- Surge lentamente

Processing

- Movimento contínuo

Result

- Reduz intensidade

---

# Fluxo

## 1. Idle

Laboratório desligado.

Core

- Hover ativo

CoreSymbol

- Invisível

Aura

- Quase invisível

Samples

- Não existem

---

## 2. Activated

Usuário clica no Core.

Core

- Boot

Aura

- Rise
- Ignição

CoreSymbol

- Surge
- Acende

Samples

- Aparecem

Hover

- Desativado

---

## 3. First Sample Loaded

Usuário seleciona a primeira imagem.

Sample Left

- Loaded

Sample Right

- Pending

Sistema aguarda.

---

## 4. Second Sample Loaded

Usuário seleciona a segunda imagem.

Ambas as amostras:

- Loaded

Sistema inicia automaticamente o processamento.

---

## 5. Processing

Samples

- Param de flutuar
- Aproximam-se do núcleo
- Desaparecem atrás do planeta

CoreSymbol

- Rotação lenta

Aura

- Respiração contínua

ReactionField

- Movimento ativo

---

## 6. Result

Processamento concluído.

CoreSymbol

- Desaparece

Aura

- Reduz intensidade

Imagem

- Fade In

Painel

- Download
- Reset

---

# Princípios

O usuário nunca vê um spinner.

O laboratório é o indicador de progresso.

O Core é sempre o protagonista.

As amostras existem apenas para alimentar o núcleo.

As animações devem comunicar comportamento, nunca decoração.

Todo movimento deve possuir um motivo.

Todo efeito visual representa um estado do laboratório.
