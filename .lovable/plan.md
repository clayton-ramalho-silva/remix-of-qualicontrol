# Zoom e Pan na marcação de PIN da planta

Permitir que o usuário aproxime (zoom) e arraste (pan) a imagem da planta no `PlantaPinSelector` para marcar o PIN com mais precisão — útil em plantas grandes onde o ponto exato é difícil de clicar.

## Comportamento

- **Controles de zoom**: botões `+`, `−` e "Resetar" sobrepostos no canto da imagem.
- **Zoom por scroll**: roda do mouse aproxima/afasta centrado no cursor.
- **Pan**: arrastar com o mouse (quando há zoom > 1) move a imagem. Cursor vira `grab`/`grabbing`.
- **Clique para marcar PIN**: continua funcionando. As coordenadas do PIN (`pinX`/`pinY` em %) são calculadas em relação à imagem original, não à viewport com zoom — então o PIN fica correto independente do nível de zoom.
- **Distinguir clique de drag**: só registra PIN se o mouse não se moveu (ou moveu < 5px) entre mousedown e mouseup.
- **Touch**: suporte básico a pinch-zoom e arrastar em mobile/tablet.
- **PIN visual**: continua posicionado em `%` relativo à imagem, então acompanha o zoom/pan naturalmente.
- **Limites**: zoom entre 1x e 5x; pan limitado para não arrastar a imagem para fora do container.

## Onde mexer

- `src/components/PlantaPinSelector.tsx` — único arquivo alterado. O bloco da imagem (linhas ~241-280) ganha:
  - Estado `zoom`, `offsetX`, `offsetY`, `isDragging`, `dragStart`.
  - Handlers `onWheel`, `onMouseDown`/`Move`/`Up`, `onTouchStart`/`Move`/`End`.
  - Wrapper interno aplicando `transform: translate(...) scale(...)` na imagem + PIN juntos.
  - Toolbar flutuante com botões shadcn.
  - Cálculo de `pinX`/`pinY` ajustado: converter coordenadas do clique de volta para % da imagem original considerando `zoom` e `offset`.

## Fora de escopo

- Não altera `PlantaView.tsx` (visualização). Pode ser feito depois se quiser.
- Não altera o schema nem a forma como `pinX`/`pinY` são armazenados.
