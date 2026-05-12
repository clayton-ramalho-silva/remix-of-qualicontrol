## Problema

A "marca laranja" no canto superior esquerdo do mapa da planta 18 são, na verdade, **dois pins de desvios sobrepostos** (#34 "Melhorar calafetação da grelha" e #37 "Painel riscado e manchado por abrasão"), ambos com `pin_x` e `pin_y` nulos no banco.

No `PlantaView.tsx`, o código faz `Number(desvio.pinX)` em valores nulos, resultando em `NaN`/`0`, e renderiza o pin em `left: 0%, top: 0%` com `translate(-50%, -50%)` — empilhando-os no canto.

## Solução

Em `src/pages/PlantaView.tsx`, dentro do `.map()` que renderiza os pins (linhas ~92-152):

- Antes de renderizar o pin, validar se `pinX` e `pinY` são números válidos (não nulos, não `NaN`).
- Se forem inválidos, retornar `null` (não renderizar o pin no mapa).
- Manter o desvio aparecendo na lista lateral normalmente (são desvios válidos, só não foram posicionados na planta).

Trecho de mudança:

```tsx
{desviosNaPlanta?.map((desvio) => {
  const x = Number(desvio.pinX);
  const y = Number(desvio.pinY);
  if (desvio.pinX == null || desvio.pinY == null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  // ... resto igual
})}
```

## Observação opcional

Posso, se quiser, ajustar também o contador "144 desvio(s) marcado(s) nesta planta" para refletir só os que têm coordenadas válidas — mas isso é opcional.

## Arquivos afetados

- `src/pages/PlantaView.tsx` (apenas frontend, sem mudanças no banco nem nos desvios #34/#37)
