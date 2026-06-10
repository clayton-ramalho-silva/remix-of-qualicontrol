// Cabeçalho repetido em todas as páginas impressas (logo Athié + título).
// Aparece SOMENTE no @media print. Usa position: fixed para que o navegador
// repita o cabeçalho em cada página gerada no PDF.

const AW_LOGO_BLACK =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663403343148/3awzRPTf7NtQjpo8LEDXgX/Logo athie l wohnrath_Black_c476567f.png";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function PrintHeader({ title, subtitle }: Props) {
  return (
    <div className="print-page-header hidden print:flex">
      <img src={AW_LOGO_BLACK} alt="Athié | Wohnrath" />
      <div className="print-header-meta">
        {title && <div className="print-header-title">{title}</div>}
        {subtitle && <div className="print-header-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
