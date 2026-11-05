# Decisão técnica: nível de compressão PNG

- **Projeto:** M.E.X.E.
- **Data da avaliação:** 05/11/2026
- **Componente:** `backend/app/infra/image_encoder.py`
- **Status:** nível `1` adotado como configuração padrão após benchmark local e validação no Kubernetes Kind.

## 1. Contexto

A etapa de codificação PNG foi identificada como o principal custo de processamento no fluxo de `/blend`.

A instrumentação do encoder separou três tempos:

- `encode`: duração do método assíncrono `ImageEncoder.encode()`, desde sua entrada até a criação e retorno do `StreamingResponse`.
- `encode_save`: duração efetiva de `PIL.Image.Image.save()`, executada no thread pool.
- `encode_stream`: duração de consumo do gerador de chunks pelo `StreamingResponse`.

A medição de `encode_stream` inclui o ritmo de consumo/entrega dos chunks e eventuais esperas do consumidor. Não é uma medição isolada da rede.

A medição inicial no Kind, usando a configuração padrão do Pillow (nível `6`), mostrou que `image.save()` consumia aproximadamente 8,4 segundos. O objetivo foi reduzir esse custo sem introduzir perda visual.

## 2. Experimento local

Foi criado um teste isolado:

`backend/tests/test_png_compression_benchmark.py`

O teste reutiliza os recursos que já existiam na suíte:

- fixture `capacity_image_samples` e opção `--capacity-images` do `conftest.py`;
- fixture `allow_capacity_candidate`, para permitir a dimensão de saída de 4096 × 4096;
- `ImageProcessingService`, para produzir uma única imagem de referência a partir das duas imagens reais de teste.

A imagem resultante do blend foi mantida constante durante a comparação. O tempo de geração dessa referência foi medido separadamente e não entrou nos tempos de codificação.

Foram comparados os níveis `0`, `1` e `6`, com três repetições por nível. A ordem dos níveis foi rotacionada entre as repetições para reduzir o viés de executar sempre o mesmo nível primeiro ou por último. O teste mediu somente o trecho de `image.save()` e registrou o tamanho do PNG produzido.

A validação de saída ocorreu fora da seção cronometrada: cada nível foi verificado para confirmar formato PNG, dimensão 4096 × 4096 e igualdade exata dos pixels com a imagem de referência. Portanto, a comparação não envolveu perda de qualidade visual.

### Resultados locais

| `compress_level` | Mediana de `save()` | Menor tempo | Tamanho | Variação de tempo vs. nível 6 | Variação de tamanho vs. nível 6 |
|---:|---:|---:|---:|---:|---:|
| 0 | 789,12 ms | 788,69 ms | 67.135.556 bytes (64,03 MiB) | −64,22% | +109,64% |
| 1 | 1.304,55 ms | 1.293,86 ms | 46.863.618 bytes (44,69 MiB) | −40,85% | +46,34% |
| 6 | 2.205,57 ms | 2.195,08 ms | 32.023.766 bytes (30,54 MiB) | Referência | Referência |

### Leitura do benchmark local

- **Nível 0:** oferece o menor tempo de codificação, mas gera o maior arquivo. Em relação ao nível 1, economiza aproximadamente 515 ms e acrescenta cerca de 19,3 MiB.
- **Nível 1:** reduz a mediana do tempo de codificação em 40,85% contra o nível 6, com aumento de tamanho de 46,34% naquele ambiente.
- **Nível 6:** gera o menor arquivo entre os três, mas exige mais tempo de CPU.

O nível `1` apareceu como o equilíbrio mais interessante para o objetivo do M.E.X.E.: reduzir o trabalho de codificação sem assumir o grande aumento de saída observado no nível `0`.

## 3. Validação no Kubernetes Kind

Após o benchmark local, o encoder foi configurado temporariamente com:

```python
image.save(
    output,
    format="PNG",
    compress_level=1,
)
```

A imagem Docker foi reconstruída, carregada no cluster Kind e o deployment foi reiniciado. O teste de `/blend` usou os mesmos arquivos de entrada e saída de 4096 × 4096.

### Referência anterior: nível 6

Na execução medida com o nível padrão, foram observados:

| Métrica | Tempo |
|---|---:|
| `encode_save` | 8,400 s |
| `encode` | 8,401 s |
| `encode_stream` | 0,325 s |
| `final` | 12,015 s |
| `curl` (`TOTAL_SECONDS`) | 13,204 s |

### Primeira execução com nível 1

| Métrica | Tempo |
|---|---:|
| `encode_save` | 3,291 s |
| `encode` | 3,293 s |
| `encode_stream` | 0,858 s |
| `final` | 6,969 s |
| `curl` (`TOTAL_SECONDS`) | 4,202 s |
| `curl` (`SIZE_DOWNLOAD`) | 34.187.911 bytes (32,60 MiB) |

A primeira execução com nível `1` já reduziu o tempo de `encode_save` em aproximadamente 60,8% em relação à referência do nível `6` no Kind.

### Três observações adicionais com nível 1

O snapshot de métricas anterior tinha `count=1`; o snapshot posterior tinha `count=4`. Subtraindo os acumulados, e assumindo que ambos pertencem ao mesmo processo/pod e que não houve outra operação intercalada, as três observações adicionais tiveram as seguintes médias:

| Métrica | Média das três observações adicionais |
|---|---:|
| `encode_save` | 2,087 s |
| `encode` | 2,087 s |
| `encode_stream` | 0,276 s |
| `final` | 3,196 s |

Cálculo aplicado a cada estágio: `(sum posterior − sum anterior) / 3`.

As três latências de cliente informadas para as chamadas consecutivas foram:

| Requisição | `TOTAL_SECONDS` | `SIZE_DOWNLOAD` |
|---:|---:|---:|
| 1 | 4,202181 s | 34.187.911 bytes |
| 2 | 4,326531 s | 34.187.911 bytes |
| 3 | 3,835373 s | 34.187.911 bytes |
| **Média** | **4,121362 s** | **34.187.911 bytes** |

A média de latência informada pelo cliente foi aproximadamente 68,8% menor que a referência anterior de 13,204 segundos. O tamanho transferido permaneceu idêntico nas três chamadas.

> **Nota sobre as métricas:** os histogramas do coletor são cumulativos por processo. As médias das três observações adicionais foram obtidas pela diferença entre snapshots, não pela divisão direta do `sum` posterior por três. Para repetir a comparação, consultar o mesmo pod e registrar snapshots antes/depois ou reiniciar controladamente o processo.

## 4. Decisão

Adotar `compress_level=1` como configuração padrão de codificação PNG do M.E.X.E.

A escolha foi feita porque:

1. O benchmark local mostrou redução de 40,85% na mediana de codificação contra o nível padrão `6`.
2. A validação no Kind confirmou uma redução expressiva do tempo de `encode_save`.
3. As chamadas consecutivas ao `/blend` apresentaram latência média de aproximadamente 4,12 segundos, contra 13,20 segundos na referência anterior.
4. As três respostas consecutivas tiveram o mesmo tamanho, indicando saída estável para a mesma entrada e configuração.
5. A verificação do benchmark confirmou igualdade exata dos pixels entre os níveis testados: a decisão não sacrifica qualidade visual.

A decisão prioriza menor tempo de processamento, aceitando arquivos maiores do que os produzidos pelo nível `6`. O nível `0` não foi escolhido porque o ganho adicional de tempo no benchmark local veio acompanhado de um aumento muito maior no tamanho do arquivo.

## 5. Ressalva: diferença de tamanho entre ambientes

O benchmark local registrou 46.863.618 bytes no nível `1`, enquanto o Kind entregou 34.187.911 bytes para a imagem processada.

Essa diferença é de aproximadamente 27% em relação ao tamanho medido localmente e ainda não foi explicada. Não se deve presumir que os tamanhos sejam diretamente comparáveis sem verificar:

- versão do Pillow e dependências/build de zlib nos dois ambientes;
- versão efetivamente implantada no pod;
- confirmação de que a imagem de referência contém exatamente os mesmos pixels nos dois ambientes;
- parâmetros efetivos usados na codificação.

Essa ressalva não invalida a medição de latência em cada ambiente, mas impede usar o tamanho local como previsão direta do tamanho de produção.

## 6. Limites das conclusões

- Os resultados são caracterizações pontuais, com poucas repetições; não representam, por si só, p95/p99 ou comportamento sob carga concorrente.
- Os tempos absolutos do benchmark local não devem ser comparados diretamente com os do Kind. A comparação válida é feita dentro de cada ambiente, sob as mesmas condições.
- `encode` e `encode_save` são medições aninhadas. `encode` contém `encode_save`; não somar os dois.
- `normalize` também contém `normalize_convert` e `normalize_resize`; não somar o estágio agregado com seus subestágios.
- `encode_stream` mede o consumo do corpo pelo consumidor ASGI/Starlette e pode incluir backpressure; não representa exclusivamente tempo de rede.
- A latência de `curl` inclui o tempo percebido pelo cliente, inclusive upload, processamento, resposta e comunicação. Não equivale a um único estágio interno.

## 7. Quando reavaliar

Repetir o benchmark e a validação no ambiente de implantação quando ocorrer uma destas situações:

- atualização do Pillow, Python, sistema base ou dependências de compressão;
- mudança no formato, modo de cor, dimensões ou características típicas das imagens;
- mudança relevante de CPU, memória, limites de recursos ou infraestrutura;
- aumento de tráfego ou concorrência;
- evidência de que o tamanho de resposta passou a ser mais importante que o custo de CPU/latência.

Ao reavaliar, comparar pelo menos `compress_level=1` e `compress_level=6`, usando a mesma imagem de referência, várias repetições, tamanho final, latência do cliente e métricas internas do encoder.

## 8. Referências internas

- Benchmark isolado: `backend/tests/test_png_compression_benchmark.py`
- Imagens reais usadas: `backend/tests/imgs/within-limit/`
- Instrumentação do encoder: `backend/app/infra/image_encoder.py`
- Métricas: `mexe_processing_duration_seconds`, stages `encode`, `encode_save`, `encode_stream` e `final`.
