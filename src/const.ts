export { COOKIE_NAME, ONE_YEAR_MS } from "@/shared/const";

// Stub: durante a migração para Lovable Cloud, o login passa a ser feito
// via Supabase Auth. Esta função é mantida para retrocompatibilidade —
// devolve a página /auth interna em vez do portal OAuth externo.
export const getLoginUrl = () => {
  return "/auth";
};
