# ArqMan

Jogo no estilo Pac-Man para revisar conceitos de **Arquitetura Computacional**.

**Jogue agora:** https://ferkage.github.io/arqcomp-arqman/

## Como jogar

### Objetivo
No labirinto há 16 fichas, cada uma com uma palavra. Acima do labirinto aparece uma **pergunta**: coma a ficha com a **resposta certa**.

- Resposta certa: a ficha some, você ganha **+100 pontos** e aparece a próxima pergunta. O jogo pausa por **3 segundos** com uma contagem na tela, para dar tempo de ler a pergunta (o mesmo acontece no início da partida).
- Resposta errada: você **perde uma vida** e volta ao início com a mesma pergunta (a ficha errada continua no labirinto).
- Fantasmas: se um deles encostar em você, também perde uma vida. Dá para desligá-los na tela inicial ou na pausa.
- Você tem **3 vidas**. Responda as 16 perguntas para vencer.
- Marque **Ordem aleatória** na tela inicial para embaralhar as perguntas.

### Controles

| Onde | Movimento | Pausa |
|------|-----------|-------|
| PC | Setas ou **W A S D** | **P** ou **Esc**, ou o botão ❚❚ |
| Celular | Deslize o dedo sobre o labirinto ou use o direcional na tela | Botão ❚❚ |

Dica: você pode apertar a próxima direção antes de chegar ao cruzamento; o personagem vira assim que for possível.

## Palavras e perguntas

| # | Palavra | Pergunta |
|---|---------|----------|
| 1 | CPU | Chip central que busca, decodifica e executa as instruções dos programas. |
| 2 | ULA | Bloco do processador que soma, subtrai e compara valores binários. |
| 3 | UC | Parte do processador que coordena as instruções e emite os sinais de comando. |
| 4 | REGISTRADORES | Pequenas posições de armazenamento dentro da CPU, as mais rápidas do computador. |
| 5 | RAM | Memória principal volátil, onde ficam os programas em execução. |
| 6 | ROM | Memória não volátil gravada na fabricação, que o usuário não pode alterar. |
| 7 | EEPROM | Memória permanente que pode ser regravada byte a byte sem retirar o chip. |
| 8 | FLASH | Memória não volátil regravada em blocos, usada em pendrives e SSDs. |
| 9 | CACHE | Memória pequena e veloz entre CPU e RAM, guarda o que é muito usado. |
| 10 | MEMORIADEMASSA | Onde os arquivos ficam guardados permanentemente, como HDs e SSDs. |
| 11 | DMA | Recurso que deixa periféricos transferirem informações à RAM sem ocupar a CPU. |
| 12 | ADDRESSBUS | Linhas que indicam qual posição de memória será lida ou escrita. |
| 13 | DATABUS | Linhas que transportam as informações entre CPU, memória e periféricos. |
| 14 | MICROCONTROLADOR | Chip único com processador, memória e entradas e saídas, como no Arduino. |
| 15 | DUALCORE | Processador com duas unidades de processamento independentes no mesmo chip. |
| 16 | QUADCORE | Processador com quatro unidades de processamento independentes no mesmo chip. |

## Executar localmente

O jogo é feito só com HTML, CSS e JavaScript, sem dependências. Basta abrir o `index.html` no navegador.

## Estrutura

```
index.html     página do jogo
style.css      visual
js/data.js     palavras e perguntas
js/game.js     labirinto, movimento, fantasmas e regras
```
