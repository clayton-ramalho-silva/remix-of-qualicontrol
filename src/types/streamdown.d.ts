// Shim temporário enquanto não migramos o assistente IA para Lovable AI Gateway.
// O componente real renderiza markdown com streaming.
declare module "streamdown" {
  import * as React from "react";
  export const Streamdown: React.FC<{ children?: React.ReactNode; className?: string }>;
}
